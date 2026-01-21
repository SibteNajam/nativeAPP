import { ApiProperty } from '@nestjs/swagger';

export class WithdrawHistoryDto {
  @ApiProperty({
    description: 'Coin name',
    example: 'USDT',
    required: false,
  })
  coin?: string;

  @ApiProperty({
    description: 'Withdraw status: 1=APPLY, 2=AUDITING, 3=WAIT, 4=PROCESSING, 5=WAIT_PACKAGING, 6=WAIT_CONFIRM, 7=SUCCESS, 8=FAILED, 9=CANCEL, 10=MANUAL',
    example: '7',
    required: false,
  })
  status?: string;

  @ApiProperty({
    description: 'Default: 1000, max: 1000',
    example: 1000,
    required: false,
  })
  limit?: number;

  @ApiProperty({
    description: 'Start time in milliseconds (default: 7 days ago from current time)',
    example: 1665300874000,
    required: false,
  })
  startTime?: number;

  @ApiProperty({
    description: 'End time in milliseconds (default: current time)',
    example: 1712134082000,
    required: false,
  })
  endTime?: number;

  @ApiProperty({
    description: 'Receive window in milliseconds (default: 5000, max: 60000)',
    example: 5000,
    required: false,
  })
  recvWindow?: number;
}
