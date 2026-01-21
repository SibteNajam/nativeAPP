import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class MyTradesDto {
  @ApiProperty({
    description: 'Trading symbol (e.g., BTCUSDT, ETHUSDT)',
    example: 'BTCUSDT',
  })
  @IsNotEmpty()
  @IsString()
  symbol: string;

  @ApiPropertyOptional({
    description: 'Order ID',
    example: '123456789',
  })
  @IsOptional()
  @IsString()
  orderId?: string;

  @ApiPropertyOptional({
    description: 'Start time in milliseconds',
    example: 1499865549590,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  startTime?: number;

  @ApiPropertyOptional({
    description: 'End time in milliseconds',
    example: 1499865549590,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  endTime?: number;

  @ApiPropertyOptional({
    description: 'Number of records (default: 100, max: 100)',
    example: 100,
    minimum: 1,
    maximum: 100,
    default: 100,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number;
}
