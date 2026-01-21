import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsString, IsNumber, IsArray, IsEnum, Min, Max, IsOptional, ValidateNested } from 'class-validator';

export enum ExchangeEnum {
  BINANCE = 'BINANCE',
  BITGET = 'BITGET',
  GATEIO = 'GATEIO',
  MEXC = 'MEXC'
}

export enum OrderSideEnum {
  BUY = 'BUY',
  SELL = 'SELL'
}
export class OrderMetaDto {
  @IsOptional()
  @IsString()
  macroSentiment?: string;

  @IsOptional()
  @IsNumber()
  macroConfMultiplier?: number;

  @IsOptional()
  @IsNumber()
  riskLiqMultiplier?: number;

  @IsOptional()
  @IsNumber()
  baseSize?: number;

  @IsOptional()
  @IsNumber()
  macroAdjustedSize?: number;

  @IsOptional()
  @IsNumber()
  finalSize?: number;
}

export class RequestOrderDto {
  @ApiProperty({
    description: 'Trading pair symbol (e.g., BTCUSDT)',
    example: 'BTCUSDT'
  })
  @IsString()
  symbol: string;
  @ApiProperty({
    description: 'Order side (BUY or SELL)',
    enum: OrderSideEnum,
    example: 'BUY'
  })
  @IsEnum(OrderSideEnum)
  side: OrderSideEnum;

  @ApiProperty({
    description: 'Position size as percentage of portfolio (0.01 = 1%)',
    example: 0.02,
    minimum: 0.001,
    maximum: 1
  })
  @IsNumber()
  @Min(0.001)
  @Max(1)
  sizePct: number;

  @ApiProperty({
    description: 'Fixed position size in USD (alternative to sizePct)',
    example: 15,
    required: false
  })
  @IsOptional()
  @IsNumber()
  sizeUsd?: number;
  @ApiProperty({
    description: 'Take profit levels (array of prices). Optional when using dynamic SLTP.',
    example: [105000, 110000],
    type: [Number],
    required: false
  })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  tpLevels?: number[];

  @ApiProperty({
    description: 'Stop loss price. Optional when using dynamic SLTP.',
    example: 95000,
    required: false
  })
  @IsOptional()
  @IsNumber()
  sl?: number;

  @ApiProperty({
    description: 'Exchange to execute order on',
    enum: ExchangeEnum,
    example: 'BINANCE'
  })
  @IsEnum(ExchangeEnum)
  exchange: ExchangeEnum;

  @ApiProperty({
    description: 'Order type (MARKET or LIMIT)',
    enum: ['MARKET', 'LIMIT'],
    example: 'MARKET',
    required: false
  })
  @IsOptional()
  @IsEnum(['MARKET', 'LIMIT'])
  type?: 'MARKET' | 'LIMIT';

  @ApiProperty({
    description: 'Limit price (required if type is LIMIT)',
    example: 100000,
    required: false
  })
  @IsOptional()
  @IsNumber()
  price?: number;


   
  @IsOptional()
  @IsNumber()
  confidence?: number;
  @IsOptional()
  @IsString()
  explanation?: string;



  @IsOptional()
  @IsString()
  policyVersion?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => OrderMetaDto)
  meta?: OrderMetaDto; // NEW: Macro risk metadata

  @ApiProperty({
    description: 'Module scores from decision engine (for logging/analysis)',
    example: { ta: 0.0, sf: 0.45, flows: 0.15 },
    required: false
  })
  @IsOptional()
  scores?: Record<string, number>;

  @ApiProperty({
    description: 'Combined score from all modules',
    example: 0.35,
    required: false
  })
  @IsOptional()
  @IsNumber()
  combinedScore?: number;

  @ApiProperty({
    description: 'Signal generation timestamp (ISO 8601) for freshness validation',
    example: '2026-01-08T10:30:00.000Z',
    required: false
  })
  @IsOptional()
  @IsString()
  signalTimestamp?: string;
}

// Export alias for backward compatibility
export { RequestOrderDto as PlaceOrderDto };
