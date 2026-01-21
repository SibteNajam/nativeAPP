import { ApiPropertyOptional } from '@nestjs/swagger';

export class CancelOrdersQueryDto {
  @ApiPropertyOptional({ description: 'Trading pair' })
  currency_pair?: string;

  @ApiPropertyOptional({ description: 'Specify side: buy or sell' })
  side?: string;

  @ApiPropertyOptional({ description: 'Account type: spot, margin, unified' })
  account?: string;

  @ApiPropertyOptional({ description: 'Processing Mode: ACK | RESULT | FULL' })
  action_mode?: string;
}
