import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsEnum, IsOptional, IsNumber, Min, Max, IsArray, ValidateNested, ArrayMaxSize, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { OrderSide, OrderType, StpMode } from './new-order.dto';

export class BatchOrderItemDto {
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
    description: 'Order quantity',
    example: '1.0',
  })
  @IsOptional()
  @IsString()
  quantity?: string;

  @ApiPropertyOptional({
    description: 'Quote order quantity',
    example: '50000',
  })
  @IsOptional()
  @IsString()
  quoteOrderQty?: string;

  @ApiPropertyOptional({
    description: 'Order price',
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
    default: StpMode.NONE,
  })
  @IsOptional()
  @IsEnum(StpMode)
  stpMode?: StpMode;
}

export class BatchOrdersDto {
  @ApiProperty({
    description: 'Array of orders (max 20 orders with same symbol)',
    type: [BatchOrderItemDto],
    example: [
      {
        symbol: 'BTCUSDT',
        side: 'BUY',
        type: 'LIMIT',
        quantity: '0.001',
        price: '40000',
      },
      {
        symbol: 'BTCUSDT',
        side: 'SELL',
        type: 'LIMIT',
        quantity: '0.001',
        price: '45000',
      },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BatchOrderItemDto)
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  batchOrders: BatchOrderItemDto[];
}
