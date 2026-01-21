import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class CancelAllOrdersDto {
  @ApiProperty({
    description: 'Trading symbol(s) - Maximum 5 symbols, separated by comma (e.g., "BTCUSDT,ETHUSDT,BNBUSDT")',
    example: 'BTCUSDT',
  })
  @IsNotEmpty()
  @IsString()
  symbol: string;
}
