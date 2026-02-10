import { IsNotEmpty, IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterBiometricDeviceDto {
  @ApiProperty({ description: 'Unique device identifier (UUID generated client-side)' })
  @IsNotEmpty()
  @IsString()
  deviceId: string;

  @ApiProperty({ description: 'Human-readable device name', example: 'iPhone 15 Pro' })
  @IsNotEmpty()
  @IsString()
  deviceName: string;

  @ApiProperty({ description: 'Device platform', enum: ['ios', 'android', 'web'] })
  @IsOptional()
  @IsEnum(['ios', 'android', 'web'])
  deviceType?: string;

  @ApiProperty({ 
    description: 'Type of biometric', 
    enum: ['fingerprint', 'face_id', 'touch_id', 'iris'],
    required: false 
  })
  @IsOptional()
  @IsEnum(['fingerprint', 'face_id', 'touch_id', 'iris'])
  biometricType?: string;
}

export class BiometricLoginDto {
  @ApiProperty({ description: 'Device ID to authenticate with' })
  @IsNotEmpty()
  @IsString()
  deviceId: string;

  @ApiProperty({ description: 'Device-bound refresh token', required: false })
  @IsOptional()
  @IsString()
  deviceToken?: string;
}

export class RevokeBiometricDeviceDto {
  @ApiProperty({ description: 'Device ID to revoke' })
  @IsNotEmpty()
  @IsString()
  deviceId: string;

  @ApiProperty({ description: 'Reason for revocation', required: false })
  @IsOptional()
  @IsString()
  reason?: string;
}
