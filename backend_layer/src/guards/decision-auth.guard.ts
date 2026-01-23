/**
 * Decision Auth Guard & Rate Limiter v6.0
 * From CORRECTED_AUDIT_JAN22_2026.md Parts U.3.3, U.3.4
 *
 * Validates HMAC signature + replay protection for decision execution.
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Inject,
  NestInterceptor,
  CallHandler,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import * as crypto from 'crypto';

/**
 * Redis client interface - compatible with ioredis or node-redis
 * Allows injection of any Redis client that implements these methods.
 */
export interface RedisClientInterface {
  exists(key: string): Promise<number>;
  setex(key: string, seconds: number, value: string): Promise<string>;
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
  get(key: string): Promise<string | null>;
  ttl(key: string): Promise<number>;
}

/**
 * Part U.3.3: Decision Auth Guard
 *
 * Validates:
 * 1. Required auth fields present
 * 2. Timestamp within tolerance (±60 seconds)
 * 3. Nonce not replayed
 * 4. HMAC signature valid
 */
@Injectable()
export class DecisionAuthGuard implements CanActivate {
  private readonly TIMESTAMP_TOLERANCE_SECONDS = 60; // ±1 minute
  private readonly NONCE_TTL_SECONDS = 300; // 5 minutes

  constructor(
    @Inject('DECISION_SHARED_SECRET') private readonly secret: string,
    @Inject('REDIS_CLIENT') private readonly redis: RedisClientInterface
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const { decision_id } = request.body;
    const signature = request.headers['x-decision-signature'];
    const headerTimestamp = request.headers['x-decision-timestamp'];
    const headerNonce = request.headers['x-decision-nonce'];

    // 1. Validate required fields
    if (!decision_id || !signature || !headerTimestamp || !headerNonce) {
      throw new UnauthorizedException(
        'MISSING_AUTH_FIELDS: decision_id, signature, timestamp, and nonce required'
      );
    }

    // 2. Validate timestamp (prevent old replays)
    const now = Math.floor(Date.now() / 1000);
    const requestTime = parseInt(headerTimestamp, 10);

    if (isNaN(requestTime)) {
      throw new UnauthorizedException('INVALID_TIMESTAMP: must be unix epoch');
    }

    if (Math.abs(now - requestTime) > this.TIMESTAMP_TOLERANCE_SECONDS) {
      throw new UnauthorizedException(
        `TIMESTAMP_EXPIRED: request time ${requestTime} vs server time ${now}, ` +
          `difference ${Math.abs(now - requestTime)}s exceeds tolerance ${this.TIMESTAMP_TOLERANCE_SECONDS}s`
      );
    }

    // 3. Validate nonce (prevent immediate replays)
    const nonceKey = `decision_nonce:${headerNonce}`;
    const nonceExists = await this.redis.exists(nonceKey);

    if (nonceExists) {
      throw new UnauthorizedException(
        'NONCE_REPLAY_DETECTED: this nonce has already been used'
      );
    }

    // 4. Store nonce to prevent future replay
    await this.redis.setex(nonceKey, this.NONCE_TTL_SECONDS, '1');

    // 5. Validate HMAC signature
    const message = `${decision_id}|${headerTimestamp}|${headerNonce}`;
    const expectedSignature = crypto
      .createHmac('sha256', this.secret)
      .update(message)
      .digest('hex');

    // Timing-safe comparison to prevent timing attacks
    const signatureBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');

    if (
      signatureBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
    ) {
      throw new UnauthorizedException(
        'INVALID_SIGNATURE: HMAC signature verification failed'
      );
    }

    // All checks passed
    return true;
  }
}

/**
 * Part U.3.4: Decision Rate Limiter
 *
 * Prevents orchestrator from flooding backend with requests.
 * Two-tier rate limiting:
 * 1. Global rate limit (system-wide DoS protection)
 * 2. Per-user rate limit
 */
@Injectable()
export class DecisionRateLimiter implements NestInterceptor {
  private readonly MAX_DECISIONS_PER_MINUTE = 60; // Per user
  private readonly MAX_GLOBAL_PER_SECOND = 100; // System-wide

  constructor(@Inject('REDIS_CLIENT') private readonly redis: RedisClientInterface) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const { decision_id } = request.body;

    // 1. Global rate check (prevent DoS)
    const globalKey = `decision_rate:global:${Math.floor(Date.now() / 1000)}`;
    const globalCount = await this.redis.incr(globalKey);
    await this.redis.expire(globalKey, 2); // TTL 2 seconds

    if (globalCount > this.MAX_GLOBAL_PER_SECOND) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'GLOBAL_RATE_LIMIT: system is processing too many decisions',
          retryAfter: 1,
        },
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    // 2. Need to get user_id from decision (requires DB lookup)
    // This is done in the controller after decision is fetched
    // For now, we'll use decision_id as rate limit key

    const decisionKey = `decision_rate:decision:${decision_id}`;
    const decisionCount = await this.redis.incr(decisionKey);
    await this.redis.expire(decisionKey, 60); // TTL 1 minute

    // Allow max 3 attempts per decision per minute (for retries)
    if (decisionCount > 3) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'DECISION_RATE_LIMIT: too many attempts for this decision',
          retryAfter: 60,
        },
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    return next.handle();
  }
}

/**
 * Per-user rate limiter (applied after decision lookup)
 */
@Injectable()
export class UserRateLimiterService {
  private readonly MAX_DECISIONS_PER_MINUTE = 60;

  constructor(@Inject('REDIS_CLIENT') private readonly redis: RedisClientInterface) {}

  async checkUserRateLimit(userId: string): Promise<{
    allowed: boolean;
    retryAfter?: number;
    currentCount?: number;
  }> {
    const userKey = `decision_rate:user:${userId}:${Math.floor(Date.now() / 60000)}`;
    const userCount = await this.redis.incr(userKey);
    await this.redis.expire(userKey, 120); // TTL 2 minutes

    if (userCount > this.MAX_DECISIONS_PER_MINUTE) {
      const ttl = await this.redis.ttl(userKey);
      return {
        allowed: false,
        retryAfter: ttl,
        currentCount: userCount,
      };
    }

    return {
      allowed: true,
      currentCount: userCount,
    };
  }
}

/**
 * Decision Controller with guards applied
 */
import { Controller, Post, Body, UseGuards, UseInterceptors, NotFoundException, ForbiddenException } from '@nestjs/common';

// Type definitions
interface ExecuteDecisionDto {
  decision_id: string;
  timestamp?: number;
  nonce?: string;
}

interface ExecuteResult {
  status: string;
  decision_id: string;
  intent_id?: string;
  order_id?: string;
  message?: string;
}

// Placeholder services (implement these based on your existing code)
interface DecisionService {
  findById(decisionId: string): Promise<any>;
}

interface IntentService {
  createFromDecision(decision: any): Promise<{
    status: string;
    intent_id: string;
  }>;
  submit(intentId: string): Promise<{
    status: string;
    order_id?: string;
  }>;
}

@Controller('decisions')
@UseGuards(DecisionAuthGuard)
@UseInterceptors(DecisionRateLimiter)
export class DecisionController {
  constructor(
    private readonly decisionService: DecisionService,
    private readonly intentService: IntentService,
    private readonly userRateLimiter: UserRateLimiterService
  ) {}

  /**
   * Part R.6: Hard gate on decision_id
   *
   * RULE: No decision_id = No execution
   */
  @Post('execute')
  async executeDecision(
    @Body() body: ExecuteDecisionDto
  ): Promise<ExecuteResult> {
    // HARD GATE: No decision_id = No execution
    if (!body.decision_id) {
      throw new ForbiddenException(
        'EXECUTION_BLOCKED: decision_id required'
      );
    }

    // 1. Fetch decision (source of truth)
    const decision = await this.decisionService.findById(body.decision_id);

    if (!decision) {
      throw new NotFoundException(
        `Decision ${body.decision_id} not found`
      );
    }

    // 2. Check user-level rate limit
    const rateCheck = await this.userRateLimiter.checkUserRateLimit(
      decision.user_id
    );

    if (!rateCheck.allowed) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'USER_RATE_LIMIT: too many decisions for this user',
          retryAfter: rateCheck.retryAfter,
        },
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    // 3. Convert decision → intent (idempotent)
    const intentResult = await this.intentService.createFromDecision(decision);

    if (intentResult.status === 'ALREADY_EXISTS') {
      // Intent already created for this decision
      return {
        status: 'IDEMPOTENT',
        decision_id: body.decision_id,
        intent_id: intentResult.intent_id,
      };
    }

    // 4. Submit intent for execution
    const submitResult = await this.intentService.submit(intentResult.intent_id);

    return {
      status: submitResult.status,
      decision_id: body.decision_id,
      intent_id: intentResult.intent_id,
      order_id: submitResult.order_id,
    };
  }
}

/**
 * Module configuration
 */
import { Module, DynamicModule } from '@nestjs/common';

interface DecisionAuthModuleOptions {
  sharedSecret: string;
  redisUrl: string;
}

@Module({})
export class DecisionAuthModule {
  static forRoot(options: DecisionAuthModuleOptions): DynamicModule {
    return {
      module: DecisionAuthModule,
      providers: [
        {
          provide: 'DECISION_SHARED_SECRET',
          useValue: options.sharedSecret,
        },
        {
          provide: 'REDIS_CLIENT',
          useFactory: async (): Promise<RedisClientInterface> => {
            // Dynamic import to allow ioredis to be optional
            // If ioredis is installed, use it. Otherwise, throw helpful error.
            try {
              // eslint-disable-next-line @typescript-eslint/no-require-imports
              const Redis = require('ioredis');
              return new Redis(options.redisUrl) as RedisClientInterface;
            } catch {
              throw new Error(
                'Redis client required. Install ioredis: npm install ioredis @types/ioredis'
              );
            }
          },
        },
        DecisionAuthGuard,
        DecisionRateLimiter,
        UserRateLimiterService,
      ],
      exports: [
        DecisionAuthGuard,
        DecisionRateLimiter,
        UserRateLimiterService,
        'REDIS_CLIENT',
      ],
    };
  }
}
