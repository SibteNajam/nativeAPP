import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsEnum, IsOptional } from 'class-validator';

export enum OrderSide {
  BUY = 'BUY',
  SELL = 'SELL',
}

export enum OrderType {
  LIMIT = 'LIMIT',
  MARKET = 'MARKET',
  LIMIT_MAKER = 'LIMIT_MAKER',
}

export enum StpMode {
  NONE = '',
  CANCEL_MAKER = 'cancel_maker',
  CANCEL_TAKER = 'cancel_taker',
  CANCEL_BOTH = 'cancel_both',
}

export class NewOrderDto {
  @ApiProperty({
    description: 'Trading symbol (e.g., BTCUSDT, ETHUSDT)',
    example: 'BTCUSDT',
  })
  @IsNotEmpty()
  @IsString()
  symbol: string;

  @ApiProperty({
    description: 'Order side',
    enum: OrderSide,
    example: OrderSide.BUY,
  })
  @IsNotEmpty()
  @IsEnum(OrderSide)
  side: OrderSide;

  @ApiProperty({
    description: 'Order type',
    enum: OrderType,
    example: OrderType.LIMIT,
  })
  @IsNotEmpty()
  @IsEnum(OrderType)
  type: OrderType;

  @ApiPropertyOptional({
    description: 'Order quantity (required for LIMIT, optional for MARKET)',
    example: '1.0',
  })
  @IsOptional()
  @IsString()
  quantity?: string;

  @ApiPropertyOptional({
    description: 'Quote order quantity (optional for MARKET orders)',
    example: '50000',
  })
  @IsOptional()
  @IsString()
  quoteOrderQty?: string;

  @ApiPropertyOptional({
    description: 'Order price (required for LIMIT orders)',
    example: '50000.00',
  })
  @IsOptional()
  @IsString()
  price?: string;

  @ApiPropertyOptional({
    description: 'Custom client order ID',
    example: 'myOrder123',
  })
  @IsOptional()
  @IsString()
  newClientOrderId?: string;

  @ApiPropertyOptional({
    description: 'Self-trade prevention mode',
    enum: StpMode,
    example: StpMode.NONE,
    default: StpMode.NONE,
  })
  @IsOptional()
  @IsEnum(StpMode)
  stpMode?: StpMode;
}
