import { IsString, IsNumber, IsOptional, IsEnum, ValidateNested, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

class TakeProfitLevelDto {
  @ApiProperty()
  @IsNumber()
  level: number;

  @ApiProperty()
  @IsNumber()
  price: number;

  @ApiProperty()
  @IsNumber()
  percentage: number;
}

export class ProcessedOrderDto {
  @ApiProperty({ description: 'Trading pair, e.g., OPEN/USDT' })
  @IsString()
  symbol: string;

  @ApiProperty({ description: 'Order side' })
  @IsString()
  side: string;

  @ApiProperty({ description: 'Entry price' })
  @IsNumber()
  entry_price: number;

  @ApiPropertyOptional({ description: 'Stop loss price' })
  @IsOptional()
  @IsNumber()
  stop_loss?: number;

  @ApiProperty({ description: 'Array of TP levels' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TakeProfitLevelDto)
  take_profit_levels: TakeProfitLevelDto[];

  @ApiProperty({ description: 'Quantity' })
  @IsNumber()
  quantity: number;

  @ApiProperty({ description: 'Notional (USDT amount)' })
  @IsNumber()
  notional: number;

  @ApiProperty({ description: 'Leverage' })
  @IsString()
  leverage: string;

  @ApiProperty({ description: 'Confidence level' })
  @IsString()
  confidence: string;

  @ApiProperty({ description: 'Timeframe' })
  @IsString()
  timeframe: string;

  @ApiProperty({ description: 'Analysis type' })
  @IsString()
  analysis_type: string;

  @ApiProperty({ description: 'Market condition' })
  @IsString()
  market_condition: string;

  @ApiProperty({ description: 'Risk level' })
  @IsString()
  risk_level: string;

  @ApiProperty({ description: 'Order type' })
  @IsString()
  order_type: string;

  @ApiProperty({ description: 'Force' })
  @IsString()
  force: string;

  @ApiProperty({ description: 'Margin mode' })
  @IsString()
  margin_mode: string;

  @ApiPropertyOptional({ description: 'Timestamp' })
  @IsOptional()
  @IsString()
  timestamp?: string | null;

  @ApiProperty({ description: 'Amount percentage' })
  @IsNumber()
  amount_percentage: number;
}