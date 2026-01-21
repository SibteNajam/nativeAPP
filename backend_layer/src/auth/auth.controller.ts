import { Controller, Get, Post, Body, Patch, Param, Delete, BadRequestException, ConflictException, UnauthorizedException, NotFoundException, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiTags, ApiConsumes } from '@nestjs/swagger';
import { Public } from 'src/decorators/isPublic';
import { User } from 'src/user/entities/user.entity';
// import { LoginRequest } from 'src/utils/requests';
import { AuthService } from './auth.service';
import { LoginRequest } from 'src/utils/requests';
import { ApicredentialsService } from 'src/apicredentials/apicredentials.service';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { EmailService } from 'src/email/email.service';
import express from 'express';

@ApiTags('Auth Controller')
@Controller('auth')
@ApiBearerAuth('Authorization')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly apiCredentialsService: ApicredentialsService,
    private readonly emailService: EmailService,
  ) { }


  @Public()
  @ApiBody({ type: LoginRequest })
  @Post('/login')
  public async login(@Body() body: LoginRequest, @Req() req: express.Request) {
    const { email, password } = body;
    console.log(`Login attempt for email: ${email}`);
    const user = await this.authService.findUserByEmail(email);
    if (user.isDeleted === true) {
      console.error(`Login failed: User ${email} is deleted`);
      throw new UnauthorizedException({
        status: 'Fail',
        data: {},
        statusCode: 401,
        message: 'User not exists'
      });
    }
    if (user.isVerified === false) {
      console.error(`Login failed: User ${email} is not verified`);
      throw new UnauthorizedException({
        status: 'Fail',
        data: {},
        statusCode: 401,
        message: 'User is not verified'
      });
    }


    if (user && user.isVerified === true) {
      const valid = user
        ? await this.authService.validateCredentials(user, password)
        : false;
      if (!valid) {
        console.error(`Login failed: Invalid credentials for ${email}`);
        throw new UnauthorizedException({
          status: 'Fail',
          data: {},
          statusCode: 401,
          message: 'Invalid credentials.'
        });
      }
    } else if (user && !user.isVerified) {
      console.error(`Login failed: User ${email} is not verified (else-if)`);
      throw new UnauthorizedException({
        status: 'Fail',
        data: {},
        statusCode: 401,
        message: 'User is not verified.'
      });
    } else {
      console.error(`Login failed: User ${email} does not exist (else)`);
      throw new UnauthorizedException({
        status: 'Fail',
        data: {},
        statusCode: 401,
        message: 'User does not exists.'
      });
    }
    const accessToken = await this.authService.generateAccessToken(user);
    const refreshToken = await this.authService.generateRefreshToken(user);

    // Get user's configured exchanges (safe - no sensitive data)
    const configuredExchanges = await this.apiCredentialsService.getUserExchanges(user.id);

    // Remove sensitive fields from user object
    const { password: _, passwordUpdatedAt: __, ...userWithoutSensitiveData } = user;

    // Extract request information for security email
    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || 
                     (req.headers['x-real-ip'] as string) || 
                     req.ip || 
                     'Unknown';
    const userAgent = req.headers['user-agent'] || 'Unknown Device';
    const device = this.parseUserAgent(userAgent);
    
    // Send login notification email (non-blocking)
    this.emailService.sendLoginNotification(
      user.email, 
      user.name  || 'User',
      ipAddress,
      device,
      'Unknown' // Location - you can add geolocation service later
    ).catch(error => {
      console.error('Failed to send login notification email:', error);
      // Don't block login if email fails
    });

    const payload = {
      ...this.buildResponsePayload(userWithoutSensitiveData as User, accessToken, refreshToken, configuredExchanges),

    };
    console.log('Login payload:', payload);
    return {
      status: 'Success',
      data: { data: payload },
      statusCode: 200,
      message: 'Login Succesfully'
    };
  }

  // Helper method to parse user agent
  private parseUserAgent(userAgent: string): string {
    // Simple parsing - you can use a library like 'ua-parser-js' for better results
    if (userAgent.includes('Mobile')) {
      if (userAgent.includes('iPhone')) return 'iPhone';
      if (userAgent.includes('iPad')) return 'iPad';
      if (userAgent.includes('Android')) return 'Android Phone';
      return 'Mobile Device';
    }
    if (userAgent.includes('Windows')) return 'Windows PC';
    if (userAgent.includes('Macintosh')) return 'Mac';
    if (userAgent.includes('Linux')) return 'Linux PC';
    return 'Unknown Device';
  }

  buildResponsePayload(user: User, accessToken: string, refreshToken?: string, configuredExchanges?: string[]) {
    return {
      user: {
        ...user,
        configured_exchanges: configuredExchanges || []
      },
      payload: {
        type: 'bearer',
        token: accessToken,
        ...(refreshToken ? { refresh_token: refreshToken } : {}),
      },
    };
  }

  @Public()
  @ApiBody({ type: RefreshTokenDto })
  @Post('/refresh')
  public async refresh(@Body() body: RefreshTokenDto) {
    const { refresh_token } = body;
    console.log('Refresh token request received');

    try {
      const { accessToken, refreshToken, user } =
        await this.authService.createAccessTokenFromRefreshToken(refresh_token);

      // Get user's configured exchanges (safe - no sensitive data)
      const configuredExchanges = await this.apiCredentialsService.getUserExchanges(user.id);

      // Remove sensitive fields from user object
      const { password: _, passwordUpdatedAt: __, ...userWithoutSensitiveData } = user as any;

      const payload = {
        ...this.buildResponsePayload(userWithoutSensitiveData as User, accessToken, refreshToken, configuredExchanges),
      };

      console.log('Refresh successful for user:', user.email);
      return {
        status: 'Success',
        data: { data: payload },
        statusCode: 200,
        message: 'Token refreshed successfully'
      };
    } catch (error) {
      console.error('Refresh token failed:', error.message);
      throw new UnauthorizedException({
        status: 'Fail',
        data: {},
        statusCode: 401,
        message: error.message || 'Invalid refresh token'
      });
    }
  }

  @Post('/logout')
  public async logout(@Req() req: any) {
    const userId = req.user?.id;
    if (userId) {
      // Revoke all refresh tokens for this user
      await this.authService.revokeAllUserTokens(userId);
      console.log(`User ${userId} logged out, all tokens revoked`);
    }
    return {
      status: 'Success',
      data: {},
      statusCode: 200,
      message: 'Logged out successfully'
    };
  }

  @Get('/me')
  public async getCurrentUser(@Req() req: any) {
    const userId = req.user?.id;
    
    if (!userId) {
      throw new UnauthorizedException({
        status: 'Fail',
        data: {},
        statusCode: 401,
        message: 'Unauthorized - No user found'
      });
    }

    try {
      const user = await this.authService.findById(userId);
      
      if (!user || user.isDeleted) {
        throw new NotFoundException({
          status: 'Fail',
          data: {},
          statusCode: 404,
          message: 'User not found'
        });
      }

      // Get user's configured exchanges (safe - no sensitive data)
      const configuredExchanges = await this.apiCredentialsService.getUserExchanges(user.id);

      // Remove sensitive fields from user object
      const { password: _, passwordUpdatedAt: __, ...userWithoutSensitiveData } = user;

      return {
        status: 'Success',
        data: {
          user: {
            ...userWithoutSensitiveData,
            configured_exchanges: configuredExchanges || []
          }
        },
        statusCode: 200,
        message: 'User retrieved successfully'
      };
    } catch (error) {
      console.error('Get current user error:', error);
      throw new UnauthorizedException({
        status: 'Fail',
        data: {},
        statusCode: 401,
        message: 'Failed to retrieve user'
      });
    }
  }
}
