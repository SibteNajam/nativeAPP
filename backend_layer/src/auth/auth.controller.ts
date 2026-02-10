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
import { BiometricService } from './biometric.service';
import { RegisterBiometricDeviceDto, BiometricLoginDto, RevokeBiometricDeviceDto } from './dto/biometric.dto';
import express from 'express';

@ApiTags('Auth Controller')
@Controller('auth')
@ApiBearerAuth('Authorization')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly apiCredentialsService: ApicredentialsService,
    private readonly emailService: EmailService,
    private readonly biometricService: BiometricService,
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
      user.name || 'User',
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

  // ==========================================
  // BIOMETRIC AUTHENTICATION ENDPOINTS
  // ==========================================

  /**
   * Register a device for biometric authentication
   * User must be authenticated (logged in) to register a device
   */
  @Post('/biometric/register')
  @ApiBody({ type: RegisterBiometricDeviceDto })
  public async registerBiometricDevice(
    @Body() dto: RegisterBiometricDeviceDto,
    @Req() req: express.Request,
  ) {
    const userId = req.user?.['id'];
    if (!userId) {
      throw new UnauthorizedException({
        status: 'Fail',
        data: {},
        statusCode: 401,
        message: 'User must be logged in to register a biometric device'
      });
    }

    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || 
                     (req.headers['x-real-ip'] as string) || 
                     req.ip || 
                     'Unknown';
    const userAgent = req.headers['user-agent'] || 'Unknown Device';

    try {
      const { deviceToken, device } = await this.biometricService.registerDevice(
        userId,
        dto,
        ipAddress,
        userAgent,
      );

      console.log(`Biometric device registered for user ${userId}: ${device.deviceName}`);

      return {
        status: 'Success',
        data: {
          deviceToken, // This should be stored securely on the client device
          device: {
            id: device.id,
            deviceId: device.deviceId,
            deviceName: device.deviceName,
            deviceType: device.deviceType,
            biometricType: device.biometricType,
            createdAt: device.createdAt,
          },
        },
        statusCode: 201,
        message: 'Biometric device registered successfully'
      };
    } catch (error) {
      console.error('Biometric device registration error:', error);
      throw new BadRequestException({
        status: 'Fail',
        data: {},
        statusCode: 400,
        message: error.message || 'Failed to register biometric device'
      });
    }
  }

  /**
   * Authenticate using biometric device
   * Public endpoint - validates device token
   */
  @Public()
  @Post('/biometric/login')
  @ApiBody({ type: BiometricLoginDto })
  public async biometricLogin(
    @Body() dto: BiometricLoginDto,
    @Req() req: express.Request,
  ) {
    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || 
                     (req.headers['x-real-ip'] as string) || 
                     req.ip || 
                     'Unknown';
    const userAgent = req.headers['user-agent'] || 'Unknown Device';

    try {
      const { accessToken, refreshToken, user } = await this.biometricService.authenticateWithDevice(
        dto,
        ipAddress,
        userAgent,
      );

      // Get user's configured exchanges
      const configuredExchanges = await this.apiCredentialsService.getUserExchanges(user.id);

      // Remove sensitive fields
      const { password: _, passwordUpdatedAt: __, ...userWithoutSensitiveData } = user;

      const payload = {
        ...this.buildResponsePayload(userWithoutSensitiveData as User, accessToken, refreshToken, configuredExchanges),
      };

      console.log(`Biometric login successful for user: ${user.email}`);

      // Send login notification email (non-blocking)
      const device = this.parseUserAgent(userAgent);
      this.emailService.sendLoginNotification(
        user.email,
        user.name || 'User',
        ipAddress,
        device + ' (Biometric)',
        'Unknown'
      ).catch(error => {
        console.error('Failed to send biometric login notification email:', error);
      });

      return {
        status: 'Success',
        data: { data: payload },
        statusCode: 200,
        message: 'Biometric authentication successful'
      };
    } catch (error) {
      console.error('Biometric login error:', error);
      throw new UnauthorizedException({
        status: 'Fail',
        data: {},
        statusCode: 401,
        message: error.message || 'Biometric authentication failed'
      });
    }
  }

  /**
   * Get all registered biometric devices for current user
   */
  @Get('/biometric/devices')
  public async getBiometricDevices(@Req() req: express.Request) {
    const userId = req.user?.['id'];
    if (!userId) {
      throw new UnauthorizedException({
        status: 'Fail',
        data: {},
        statusCode: 401,
        message: 'Unauthorized'
      });
    }

    try {
      const devices = await this.biometricService.getUserDevices(userId);

      return {
        status: 'Success',
        data: {
          devices: devices.map(d => ({
            id: d.id,
            deviceId: d.deviceId,
            deviceName: d.deviceName,
            deviceType: d.deviceType,
            biometricType: d.biometricType,
            lastUsedAt: d.lastUsedAt,
            createdAt: d.createdAt,
            isActive: d.isActive,
          })),
        },
        statusCode: 200,
        message: 'Biometric devices retrieved successfully'
      };
    } catch (error) {
      console.error('Get biometric devices error:', error);
      throw new BadRequestException({
        status: 'Fail',
        data: {},
        statusCode: 400,
        message: 'Failed to retrieve biometric devices'
      });
    }
  }

  /**
   * Revoke a biometric device
   */
  @Post('/biometric/revoke')
  @ApiBody({ type: RevokeBiometricDeviceDto })
  public async revokeBiometricDevice(
    @Body() dto: RevokeBiometricDeviceDto,
    @Req() req: express.Request,
  ) {
    const userId = req.user?.['id'];
    if (!userId) {
      throw new UnauthorizedException({
        status: 'Fail',
        data: {},
        statusCode: 401,
        message: 'Unauthorized'
      });
    }

    try {
      await this.biometricService.revokeDevice(userId, dto);

      console.log(`Device ${dto.deviceId} revoked for user ${userId}`);

      return {
        status: 'Success',
        data: {},
        statusCode: 200,
        message: 'Biometric device revoked successfully'
      };
    } catch (error) {
      console.error('Revoke biometric device error:', error);
      throw new BadRequestException({
        status: 'Fail',
        data: {},
        statusCode: 400,
        message: error.message || 'Failed to revoke biometric device'
      });
    }
  }
}

