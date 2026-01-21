import { ApiPropertyOptional } from '@nestjs/swagger';

export class CancelPriceOrdersQueryDto {
  @ApiPropertyOptional({ description: 'Trading market (e.g. BTC_USDT)' })
  market?: string;

  @ApiPropertyOptional({ description: 'Trading account type: normal | margin | unified' })
  account?: string;
}
