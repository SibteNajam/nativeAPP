import { Injectable, UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BiometricDevice } from './entities/biometric-device.entity';
import { RegisterBiometricDeviceDto, BiometricLoginDto, RevokeBiometricDeviceDto } from './dto/biometric.dto';
import { AuthService } from './auth.service';
import { RefreshTokenService } from './refreshToken.service';
import { User } from 'src/user/entities/user.entity';

@Injectable()
export class BiometricService {
  constructor(
    @InjectRepository(BiometricDevice)
    private readonly biometricDeviceRepo: Repository<BiometricDevice>,
    private readonly authService: AuthService,
    private readonly refreshTokenService: RefreshTokenService,
  ) {}

  /**
   * Register a new biometric device for a user
   * Returns a device-bound long-lived refresh token
   */
  async registerDevice(
    userId: string,
    dto: RegisterBiometricDeviceDto,
    ipAddress: string,
    userAgent: string,
  ): Promise<{ deviceToken: string; device: BiometricDevice }> {
    // Check if device is already registered
    const existingDevice = await this.biometricDeviceRepo.findOne({
      where: { userId, deviceId: dto.deviceId },
    });

    if (existingDevice && existingDevice.isActive && !existingDevice.isRevoked) {
      throw new BadRequestException('Device already registered for biometric authentication');
    }

    // Get user to generate refresh token
    const user = await this.authService.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Generate a long-lived refresh token for this device
    const { jwt: refreshToken, tokenEntity } = await this.authService.generateRefreshTokenWithEntity(user);

    // Create or update device record
    let device: BiometricDevice;
    if (existingDevice) {
      // Re-activate existing device
      existingDevice.isActive = true;
      existingDevice.isRevoked = false;
      existingDevice.deviceName = dto.deviceName;
      existingDevice.deviceType = dto.deviceType || existingDevice.deviceType;
      existingDevice.biometricType = dto.biometricType || existingDevice.biometricType;
      existingDevice.refreshTokenId = tokenEntity.id;
      existingDevice.ipAddress = ipAddress;
      existingDevice.userAgent = userAgent;
      existingDevice.lastUsedAt = new Date();
      device = await this.biometricDeviceRepo.save(existingDevice);
    } else {
      // Create new device
      device = this.biometricDeviceRepo.create({
        userId,
        deviceId: dto.deviceId,
        deviceName: dto.deviceName,
        deviceType: dto.deviceType,
        biometricType: dto.biometricType,
        refreshTokenId: tokenEntity.id,
        ipAddress,
        userAgent,
        isActive: true,
        isRevoked: false,
      });
      device = await this.biometricDeviceRepo.save(device);
    }

    // Return the refresh token to be stored securely on device
    return { deviceToken: refreshToken, device };
  }

  /**
   * Authenticate using biometric device
   * Validates device and returns new access + refresh tokens
   */
  async authenticateWithDevice(
    dto: BiometricLoginDto,
    ipAddress: string,
    userAgent: string,
  ): Promise<{ accessToken: string; refreshToken: string; user: User }> {
    // Find device
    const device = await this.biometricDeviceRepo.findOne({
      where: { deviceId: dto.deviceId },
      relations: ['user'],
    });

    if (!device) {
      throw new UnauthorizedException('Device not registered for biometric authentication');
    }

    if (device.isRevoked || !device.isActive) {
      throw new UnauthorizedException('Device has been revoked or deactivated');
    }

    // Validate the device token (refresh token) if provided
    if (dto.deviceToken) {
      try {
        const { user, token } = await this.authService.resolveRefreshToken(dto.deviceToken);
        
        // Update device last used
        device.lastUsedAt = new Date();
        device.ipAddress = ipAddress;
        device.userAgent = userAgent;
        await this.biometricDeviceRepo.save(device);

        // Generate new access token (don't rotate refresh token for biometric devices)
        const accessToken = await this.authService.generateAccessToken(user);
        
        return {
          accessToken,
          refreshToken: dto.deviceToken, // Keep same device token
          user,
        };
      } catch (error) {
        throw new UnauthorizedException('Invalid or expired device token');
      }
    } else {
      // Fallback: just validate device registration and return tokens
      const user = await this.authService.findById(device.userId);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // Update device last used
      device.lastUsedAt = new Date();
      device.ipAddress = ipAddress;
      device.userAgent = userAgent;
      await this.biometricDeviceRepo.save(device);

      // Generate fresh tokens
      const accessToken = await this.authService.generateAccessToken(user);
      const refreshToken = await this.authService.generateRefreshToken(user);

      return { accessToken, refreshToken, user };
    }
  }

  /**
   * Get all devices for a user
   */
  async getUserDevices(userId: string): Promise<BiometricDevice[]> {
    return this.biometricDeviceRepo.find({
      where: { userId, isRevoked: false },
      order: { lastUsedAt: 'DESC' },
    });
  }

  /**
   * Revoke a specific device
   */
  async revokeDevice(userId: string, dto: RevokeBiometricDeviceDto): Promise<void> {
    const device = await this.biometricDeviceRepo.findOne({
      where: { userId, deviceId: dto.deviceId },
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    device.isRevoked = true;
    device.isActive = false;
    device.revokedAt = new Date();
    device.revokedReason = dto.reason || 'User requested revocation';

    await this.biometricDeviceRepo.save(device);

    // Also revoke the associated refresh token if it exists
    if (device.refreshTokenId) {
      await this.refreshTokenService.revokeToken(device.refreshTokenId);
    }
  }

  /**
   * Revoke all devices for a user (used during security events)
   */
  async revokeAllUserDevices(userId: string, reason: string = 'Security event'): Promise<void> {
    await this.biometricDeviceRepo.update(
      { userId, isRevoked: false },
      {
        isRevoked: true,
        isActive: false,
        revokedAt: new Date(),
        revokedReason: reason,
      },
    );
  }

  /**
   * Check if user has biometric enabled
   */
  async hasBiometricEnabled(userId: string): Promise<boolean> {
    const count = await this.biometricDeviceRepo.count({
      where: { userId, isActive: true, isRevoked: false },
    });
    return count > 0;
  }
}
