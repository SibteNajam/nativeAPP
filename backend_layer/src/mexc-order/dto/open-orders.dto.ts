import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class OpenOrdersDto {
  @ApiPropertyOptional({
    description: 'Trading symbol (e.g., BTCUSDT, ETHUSDT)',
    example: 'BTCUSDT',
  })
  @IsOptional()
  @IsString()
  symbol?: string;

  @ApiPropertyOptional({
    description: 'The value cannot be greater than 60000. Default 5000ms',
    example: 5000,
    minimum: 1,
    maximum: 60000,
    default: 5000,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(60000)
  recvWindow?: number;
}
