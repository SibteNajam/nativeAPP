import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class TradeFeeDto {
  @ApiProperty({
    description: 'Trading symbol (e.g., BTCUSDT, ETHUSDT)',
    example: 'BTCUSDT',
  })
  @IsNotEmpty()
  @IsString()
  symbol: string;
}
