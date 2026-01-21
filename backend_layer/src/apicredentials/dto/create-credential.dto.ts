import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ExchangeType } from '../entities/api-credential.entity';

export class CreateCredentialDto {
  @ApiProperty({
    enum: ExchangeType,
    description: 'Exchange name',
    example: ExchangeType.BINANCE,
  })
  @IsEnum(ExchangeType)
  @IsNotEmpty()
  exchange: ExchangeType;

  @ApiProperty({
    description: 'API Key from exchange',
    example: 'your_api_key_here',
  })
  @IsString()
  @IsNotEmpty()
  apiKey: string;

  @ApiProperty({
    description: 'Secret Key from exchange',
    example: 'your_secret_key_here',
  })
  @IsString()
  @IsNotEmpty()
  secretKey: string;

  @ApiPropertyOptional({
    description: 'Passphrase (required for some exchanges like Bitget)',
    example: 'your_passphrase',
  })
  @IsString()
  @IsOptional()
  passphrase?: string;

  @ApiPropertyOptional({
    description: 'User-friendly label for this credential',
    example: 'My Binance Main Account',
    maxLength: 100,
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  label?: string;

  @ApiPropertyOptional({
    description: 'Whether this credential should be used for active trading (WebSocket order monitoring)',
    example: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  activeTrading?: boolean;
}
