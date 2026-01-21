import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PriceTriggerDto {
  @ApiProperty({ description: 'Trigger price' })
  price: string;

  @ApiProperty({ description: 'Price trigger condition', enum: ['>=', '<='] })
  rule: string;

  @ApiProperty({ description: 'Maximum wait time for trigger condition in seconds' })
  expiration: number;
}

export class PutOrderDto {
  @ApiPropertyOptional({ description: 'Order type', enum: ['limit', 'market'], default: 'limit' })
  type?: string;

  @ApiProperty({ description: 'Order side', enum: ['buy', 'sell'] })
  side: string;

  @ApiProperty({ description: 'Order price' })
  price: string;

  @ApiProperty({ description: 'Trading quantity' })
  amount: string;

  @ApiProperty({ description: 'Trading account type', enum: ['normal', 'margin', 'unified'] })
  account: string;

  @ApiPropertyOptional({ description: 'Time in force', enum: ['gtc', 'ioc'] })
  time_in_force?: string;

  @ApiPropertyOptional({ description: 'Whether to borrow coins automatically' })
  auto_borrow?: boolean;

  @ApiPropertyOptional({ description: 'Whether to repay the loan automatically' })
  auto_repay?: boolean;

  @ApiPropertyOptional({ description: 'The source of the order: web|api|app' })
  text?: string;
}

export class PriceOrderDto {
  @ApiProperty({ type: PriceTriggerDto })
  trigger: PriceTriggerDto;

  @ApiProperty({ type: PutOrderDto })
  put: PutOrderDto;

  @ApiProperty({ description: 'Market / trading pair, e.g. BTC_USDT' })
  market: string;
}

export class PriceOrderResponseDto {
  @ApiProperty({ description: 'Auto order ID' })
  id: number;
}
