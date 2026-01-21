import { ApiProperty } from '@nestjs/swagger';

export class GateioSpotAccountDto {
  @ApiProperty({ description: 'Currency detail', example: 'ETH' })
  currency: string;

  @ApiProperty({ description: 'Available amount', example: '968.8' })
  available: string;

  @ApiProperty({ description: 'Locked amount, used in trading', example: '0' })
  locked: string;

  @ApiProperty({ description: 'Version number', example: 98 })
  update_id: number;
}
