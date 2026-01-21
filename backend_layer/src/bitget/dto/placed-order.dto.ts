import { IsString, IsNumber, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PlacedOrderDto {
  @ApiProperty({ description: 'Trading pair, e.g., OPEN/USDT' })
  @IsString()
  symbol: string;

  @ApiProperty({ description: 'Entry price' })
  @IsNumber()
  entry_price: number;

  @ApiProperty({ description: 'Order type', enum: ['market', 'limit'] })
  @IsEnum(['market', 'limit'])
  order_type: 'market' | 'limit';

  @ApiProperty({ description: 'Order size' })
  @IsString()
  size: string;

  @ApiProperty({ description: 'Quantity' })
  @IsNumber()
  quantity: number;

  @ApiPropertyOptional({ description: 'Stop loss price' })
  @IsOptional()
  @IsString()
  stop_loss?: string;

  @ApiProperty({ description: 'Take profit price' })
  @IsNumber()
  take_profit: number;

  @ApiProperty({ description: 'Order side', enum: ['buy', 'sell'] })
  @IsEnum(['buy', 'sell'])
  side: 'buy' | 'sell';

  @ApiProperty({ description: 'Execution strategy', enum: ['gtc', 'post_only', 'fok', 'ioc'] })
  @IsEnum(['gtc', 'post_only', 'fok', 'ioc'])
  force: 'gtc' | 'post_only' | 'fok' | 'ioc';

  @ApiProperty({ description: 'Order ID' })
  @IsString()
  order_id: string;

  @ApiProperty({ description: 'Client order ID' })
  @IsString()
  client_oid: string;

  @ApiProperty({ description: 'Trade placement time' })
  @IsString()
  trade_placement_time: string;

  @ApiProperty({ description: 'TP level' })
  @IsNumber()
  tp_level: number;
}