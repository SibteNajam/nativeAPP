import { ApiProperty } from '@nestjs/swagger';

export class CancelBatchOrderItemDto {
  @ApiProperty({ description: 'Order currency pair, e.g. BTC_USDT' })
  currency_pair: string;

  @ApiProperty({ description: 'Order ID to cancel' })
  id: string;
}
