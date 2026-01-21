import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class WalletTransferDto {
  @ApiProperty({ description: 'Transfer currency name. For contract accounts can be POINT or supported settlement currencies' })
  currency: string;

  @ApiProperty({ description: 'Account to transfer from', enum: ['spot', 'margin', 'futures', 'delivery', 'options'] })
  from: string;

  @ApiProperty({ description: 'Account to transfer to', enum: ['spot', 'margin', 'futures', 'delivery', 'options'] })
  to: string;

  @ApiProperty({ description: 'Transfer amount' })
  amount: string;

  @ApiPropertyOptional({ description: 'Margin trading pair. Required when transferring to or from margin account' })
  currency_pair?: string;

  @ApiPropertyOptional({ description: 'Contract settlement currency. Required when transferring to or from contract account' })
  settle?: string;
}
