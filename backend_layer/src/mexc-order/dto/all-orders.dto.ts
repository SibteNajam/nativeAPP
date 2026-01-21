import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class AllOrdersDto {
  @ApiPropertyOptional({
    description: 'Trading symbol (e.g., BTCUSDT, ETHUSDT)',
    example: 'BTCUSDT',
  })
  @IsOptional()
  @IsString()
  symbol: string;

  @ApiPropertyOptional({
    description: 'Start time in milliseconds',
    example: 1499827319559,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  startTime?: number;

  @ApiPropertyOptional({
    description: 'End time in milliseconds',
    example: 1499827319559,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  endTime?: number;

  @ApiPropertyOptional({
    description: 'Number of records (default: 500, max: 1000)',
    example: 500,
    minimum: 1,
    maximum: 1000,
    default: 500,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(1000)
  limit?: number;
}
