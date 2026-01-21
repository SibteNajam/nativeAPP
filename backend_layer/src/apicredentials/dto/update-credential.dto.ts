import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateCredentialDto {
  @ApiPropertyOptional({
    description: 'API Key from exchange',
    example: 'updated_api_key',
  })
  @IsString()
  @IsOptional()
  apiKey?: string;

  @ApiPropertyOptional({
    description: 'Secret Key from exchange',
    example: 'updated_secret_key',
  })
  @IsString()
  @IsOptional()
  secretKey?: string;

  @ApiPropertyOptional({
    description: 'Passphrase',
    example: 'updated_passphrase',
  })
  @IsString()
  @IsOptional()
  passphrase?: string;

  @ApiPropertyOptional({
    description: 'Enable or disable this credential',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'User-friendly label',
    example: 'My Updated Label',
    maxLength: 100,
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  label?: string;

  @ApiPropertyOptional({
    description: 'Whether this credential should be used for active trading (WebSocket order monitoring)',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  activeTrading?: boolean;
}
