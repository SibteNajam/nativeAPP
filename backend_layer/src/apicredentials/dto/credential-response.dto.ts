import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExchangeType } from '../entities/api-credential.entity';

export class CredentialResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: ExchangeType })
  exchange: ExchangeType;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty({ description: 'Whether this credential is used for active trading' })
  activeTrading: boolean;

  @ApiPropertyOptional()
  label?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class DecryptedCredentialDto {
  apiKey: string;
  secretKey: string;
  passphrase?: string;
}
