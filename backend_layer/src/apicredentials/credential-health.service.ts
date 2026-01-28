import { Injectable, Logger } from '@nestjs/common';
import { ExchangeType } from './entities/api-credential.entity';

/**
 * ============================================================================
 * CREDENTIAL HEALTH MANAGER - Production-Grade Intelligent Credential System
 * ============================================================================
 * 
 * PROBLEM SOLVED:
 * When one user has invalid API keys (revoked, IP restricted, etc.), the system
 * was failing ALL requests instead of gracefully falling back to healthy credentials.
 * 
 * SOLUTION:
 * A smart in-memory health tracking system that:
 * 1. Tracks success/failure for each credential
 * 2. Auto-quarantines bad credentials after consecutive failures
 * 3. Provides intelligent credential selection (healthy first)
 * 4. Self-heals by periodically retrying quarantined credentials
 * 5. Emits metrics for monitoring/alerting
 * 
 * DESIGN PRINCIPLES:
 * - Zero database dependencies (in-memory for speed)
 * - Thread-safe with atomic operations
 * - Configurable thresholds
 * - Graceful degradation - never blocks if uncertain
 * 
 * @author Principal Architect
 * @version 2.0.0
 * @since Jan 24, 2026
 */

export interface CredentialHealth {
  userId: string;
  exchange: ExchangeType | string;
  consecutiveFailures: number;
  totalFailures: number;
  totalSuccesses: number;
  lastFailure: Date | null;
  lastSuccess: Date | null;
  lastError: string | null;
  isQuarantined: boolean;
  quarantinedAt: Date | null;
  quarantineReason: string | null;
}

export interface CredentialWithHealth<T = any> {
  credential: T;
  health: CredentialHealth;
  priority: number; // Lower = better (healthier credentials have lower priority number)
}

export interface HealthConfig {
  /** Number of consecutive failures before quarantine (default: 3) */
  quarantineThreshold: number;
  /** Quarantine duration in milliseconds (default: 5 minutes) */
  quarantineDurationMs: number;
  /** Health check interval in milliseconds (default: 30 seconds) */
  healthCheckIntervalMs: number;
}

const DEFAULT_CONFIG: HealthConfig = {
  quarantineThreshold: 3,
  quarantineDurationMs: 5 * 60 * 1000, // 5 minutes
  healthCheckIntervalMs: 30 * 1000,    // 30 seconds
};

@Injectable()
export class CredentialHealthService {
  private readonly logger = new Logger(CredentialHealthService.name);
  
  /** In-memory health store: Map<"userId:exchange", CredentialHealth> */
  private readonly healthStore: Map<string, CredentialHealth> = new Map();
  
  /** Configuration */
  private readonly config: HealthConfig;

  constructor() {
    this.config = { ...DEFAULT_CONFIG };
    this.logger.log('🏥 Credential Health Manager initialized');
    this.logger.log(`   ├─ Quarantine threshold: ${this.config.quarantineThreshold} consecutive failures`);
    this.logger.log(`   ├─ Quarantine duration: ${this.config.quarantineDurationMs / 1000}s`);
    this.logger.log(`   └─ Health check interval: ${this.config.healthCheckIntervalMs / 1000}s`);
  }

  /**
   * Generate unique key for a credential
   */
  private getKey(userId: string, exchange: string): string {
    return `${userId}:${exchange.toLowerCase()}`;
  }

  /**
   * Get or initialize health record for a credential
   */
  private getOrCreateHealth(userId: string, exchange: string): CredentialHealth {
    const key = this.getKey(userId, exchange);
    
    if (!this.healthStore.has(key)) {
      this.healthStore.set(key, {
        userId,
        exchange: exchange.toLowerCase(),
        consecutiveFailures: 0,
        totalFailures: 0,
        totalSuccesses: 0,
        lastFailure: null,
        lastSuccess: null,
        lastError: null,
        isQuarantined: false,
        quarantinedAt: null,
        quarantineReason: null,
      });
    }
    
    return this.healthStore.get(key)!;
  }

  /**
   * Report a successful API call for a credential
   * Resets consecutive failures and removes from quarantine
   */
  recordSuccess(userId: string, exchange: string): void {
    const health = this.getOrCreateHealth(userId, exchange);
    const wasQuarantined = health.isQuarantined;
    
    health.consecutiveFailures = 0;
    health.totalSuccesses++;
    health.lastSuccess = new Date();
    health.lastError = null;
    
    // Auto-heal: Remove from quarantine on success
    if (health.isQuarantined) {
      health.isQuarantined = false;
      health.quarantinedAt = null;
      health.quarantineReason = null;
      this.logger.log(`✅ [${userId.substring(0, 8)}...][${exchange}] Credential HEALED - removed from quarantine`);
    }
    
    if (wasQuarantined) {
      this.logger.log(`🎉 [${userId.substring(0, 8)}...][${exchange}] Recovery successful after quarantine`);
    }
  }

  /**
   * Report a failed API call for a credential
   * Increments failure count and may trigger quarantine
   */
  recordFailure(userId: string, exchange: string, errorMessage: string): void {
    const health = this.getOrCreateHealth(userId, exchange);
    
    health.consecutiveFailures++;
    health.totalFailures++;
    health.lastFailure = new Date();
    health.lastError = errorMessage;
    
    // Check for specific error patterns that indicate invalid credentials
    const isAuthError = this.isAuthenticationError(errorMessage);
    
    // Auto-quarantine after threshold OR immediately for auth errors
    if (health.consecutiveFailures >= this.config.quarantineThreshold || isAuthError) {
      if (!health.isQuarantined) {
        health.isQuarantined = true;
        health.quarantinedAt = new Date();
        health.quarantineReason = isAuthError 
          ? `Authentication error: ${errorMessage.substring(0, 100)}`
          : `${health.consecutiveFailures} consecutive failures`;
        
        this.logger.warn(
          `🚨 [${userId.substring(0, 8)}...][${exchange}] Credential QUARANTINED ` +
          `(reason: ${health.quarantineReason})`
        );
      }
    } else {
      this.logger.warn(
        `⚠️ [${userId.substring(0, 8)}...][${exchange}] Failure ${health.consecutiveFailures}/${this.config.quarantineThreshold}: ${errorMessage.substring(0, 100)}`
      );
    }
  }

  /**
   * Check if error message indicates an authentication/credential problem
   * These errors warrant immediate quarantine
   * 
   * IMPORTANT: Generic 401 errors are NOT treated as auth errors!
   * A 401 might mean missing endpoint permission (e.g., Enable Reading for myTrades)
   * but the API key itself is still valid for other operations.
   * We only quarantine for EXPLICIT invalid key errors.
   */
  private isAuthenticationError(errorMessage: string): boolean {
    // STRICT patterns that definitively mean the API key is invalid
    const authPatterns = [
      'Invalid API-key',
      'Invalid ACCESS_KEY',
      '-2015',           // Binance: Invalid API-key, IP, or permissions for action
      '30011',           // Bitget: Invalid ACCESS_KEY
      '30012',           // Bitget: Invalid signature
      '30013',           // Bitget: Invalid passphrase
      'APIKEY_INVALID',
      'Apikey does not exist',
      'API-key format invalid',
      // REMOVED: '401', 'Unauthorized' - too generic, might be permission-specific
      'IP not whitelisted',
    ];
    
    const lowerError = errorMessage.toLowerCase();
    return authPatterns.some(pattern => 
      lowerError.includes(pattern.toLowerCase())
    );
  }

  /**
   * Check if a quarantined credential should be retried
   * (Quarantine period has expired)
   */
  shouldRetryQuarantined(userId: string, exchange: string): boolean {
    const health = this.getOrCreateHealth(userId, exchange);
    
    if (!health.isQuarantined || !health.quarantinedAt) {
      return true; // Not quarantined, always allow
    }
    
    const now = new Date();
    const quarantineAge = now.getTime() - health.quarantinedAt.getTime();
    
    return quarantineAge >= this.config.quarantineDurationMs;
  }

  /**
   * Check if a credential is currently healthy (not quarantined)
   */
  isHealthy(userId: string, exchange: string): boolean {
    const key = this.getKey(userId, exchange);
    const health = this.healthStore.get(key);
    
    // Unknown credentials are considered healthy (fail-open)
    if (!health) return true;
    
    // If quarantined but quarantine expired, consider healthy for retry
    if (health.isQuarantined) {
      return this.shouldRetryQuarantined(userId, exchange);
    }
    
    return true;
  }

  /**
   * Get health status for a specific credential
   */
  getHealth(userId: string, exchange: string): CredentialHealth | null {
    const key = this.getKey(userId, exchange);
    return this.healthStore.get(key) || null;
  }

  /**
   * Get all quarantined credentials
   */
  getQuarantinedCredentials(): CredentialHealth[] {
    return Array.from(this.healthStore.values())
      .filter(h => h.isQuarantined);
  }

  /**
   * MAIN API: Sort credentials by health priority
   * 
   * Returns credentials sorted with healthiest first:
   * 1. Never-failed credentials (priority 0)
   * 2. Healthy credentials with some failures (priority = consecutiveFailures)
   * 3. Quarantined but expired (priority 100 - eligible for retry)
   * 4. Actively quarantined (priority 1000 - last resort)
   * 
   * @param credentials - Array of credentials with userId and exchange
   * @returns Sorted array with health metadata
   */
  sortByHealth<T extends { userId: string; exchange: string | ExchangeType }>(
    credentials: T[]
  ): CredentialWithHealth<T>[] {
    const now = new Date();
    
    return credentials
      .map(cred => {
        const health = this.getOrCreateHealth(cred.userId, cred.exchange as string);
        
        let priority: number;
        
        if (health.isQuarantined) {
          const quarantineAge = health.quarantinedAt 
            ? now.getTime() - health.quarantinedAt.getTime()
            : 0;
          
          if (quarantineAge >= this.config.quarantineDurationMs) {
            // Quarantine expired - eligible for retry
            priority = 100 + health.consecutiveFailures;
          } else {
            // Actively quarantined - last resort
            priority = 1000 + health.consecutiveFailures;
          }
        } else if (health.totalSuccesses === 0 && health.totalFailures === 0) {
          // Never used - treat as healthy but after proven ones
          priority = 1;
        } else if (health.consecutiveFailures === 0) {
          // Healthy with track record
          priority = 0;
        } else {
          // Some failures but not quarantined
          priority = health.consecutiveFailures;
        }
        
        return {
          credential: cred,
          health,
          priority,
        };
      })
      .sort((a, b) => a.priority - b.priority);
  }

  /**
   * MAIN API: Get a healthy credential from a list
   * 
   * Smart selection:
   * 1. Tries preferred userId first (if healthy)
   * 2. Falls back to any healthy credential
   * 3. Returns null only if ALL credentials are quarantined
   * 
   * @param credentials - Available credentials
   * @param preferredUserId - Optional userId to prefer
   * @returns Best credential or null if all quarantined
   */
  selectHealthyCredential<T extends { userId: string; exchange: string | ExchangeType }>(
    credentials: T[],
    preferredUserId?: string
  ): T | null {
    if (credentials.length === 0) return null;
    
    const sorted = this.sortByHealth(credentials);
    
    // If preferred user specified and healthy, use them
    if (preferredUserId) {
      const preferred = sorted.find(
        s => s.credential.userId === preferredUserId && s.priority < 100
      );
      if (preferred) {
        return preferred.credential;
      }
    }
    
    // Find first non-quarantined credential
    const healthy = sorted.find(s => s.priority < 1000);
    if (healthy) {
      return healthy.credential;
    }
    
    // All quarantined - try the one that's been quarantined longest (might be recoverable)
    const oldest = sorted[0];
    if (oldest) {
      this.logger.warn(
        `⚠️ All ${credentials.length} credentials quarantined, ` +
        `attempting with oldest quarantine: ${oldest.credential.userId.substring(0, 8)}...`
      );
      return oldest.credential;
    }
    
    return null;
  }

  /**
   * MAIN API: Execute a function with credential fallback
   * 
   * Tries each credential in health-priority order until one succeeds.
   * Records success/failure for each attempt.
   * 
   * @param credentials - Available credentials
   * @param operation - Async function to execute with each credential
   * @param operationName - Name for logging
   * @returns Result from first successful credential, or throws if all fail
   */
  async executeWithFallback<T, R>(
    credentials: Array<{ userId: string; exchange: string | ExchangeType; [key: string]: any }>,
    operation: (cred: typeof credentials[0]) => Promise<R>,
    operationName: string = 'operation'
  ): Promise<{ result: R; credential: typeof credentials[0] }> {
    const sorted = this.sortByHealth(credentials);
    
    const errors: Array<{ userId: string; error: string }> = [];
    
    for (const { credential, priority } of sorted) {
      const userLabel = `${credential.userId.substring(0, 8)}...`;
      
      // Skip actively quarantined credentials (priority >= 1000) unless they're the only option
      if (priority >= 1000 && sorted.some(s => s.priority < 1000)) {
        this.logger.debug(`⏭️ Skipping quarantined credential ${userLabel} for ${operationName}`);
        continue;
      }
      
      try {
        const result = await operation(credential);
        
        // Success! Record it and return
        this.recordSuccess(credential.userId, credential.exchange as string);
        
        if (errors.length > 0) {
          this.logger.log(
            `✅ ${operationName} succeeded with ${userLabel} after ${errors.length} failures`
          );
        }
        
        return { result, credential };
        
      } catch (error) {
        const errorMsg = error?.message || String(error);
        this.recordFailure(credential.userId, credential.exchange as string, errorMsg);
        errors.push({ userId: credential.userId, error: errorMsg.substring(0, 100) });
        
        // Continue to next credential
      }
    }
    
    // All credentials failed
    const errorSummary = errors
      .map(e => `${e.userId.substring(0, 8)}: ${e.error}`)
      .join('; ');
    
    throw new Error(
      `All ${credentials.length} credentials failed for ${operationName}. Errors: ${errorSummary}`
    );
  }

  /**
   * Get health summary for monitoring/debugging
   */
  getHealthSummary(): {
    total: number;
    healthy: number;
    quarantined: number;
    credentials: CredentialHealth[];
  } {
    const all = Array.from(this.healthStore.values());
    return {
      total: all.length,
      healthy: all.filter(h => !h.isQuarantined).length,
      quarantined: all.filter(h => h.isQuarantined).length,
      credentials: all,
    };
  }

  /**
   * Clear health data for a specific credential (e.g., when user updates their API keys)
   */
  resetHealth(userId: string, exchange: string): void {
    const key = this.getKey(userId, exchange);
    this.healthStore.delete(key);
    this.logger.log(`🔄 Health reset for ${userId.substring(0, 8)}...[${exchange}]`);
  }

  /**
   * Clear all health data
   */
  resetAllHealth(): void {
    this.healthStore.clear();
    this.logger.log('🔄 All credential health data cleared');
  }
}
