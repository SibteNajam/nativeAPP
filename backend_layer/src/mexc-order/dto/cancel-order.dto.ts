import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class CancelOrderDto {
  @ApiProperty({
    description: 'Trading symbol (e.g., BTCUSDT, ETHUSDT)',
    example: 'BTCUSDT',
  })
  @IsNotEmpty()
  @IsString()
  symbol: string;

  @ApiPropertyOptional({
    description: 'Order ID (either orderId or origClientOrderId must be provided)',
    example: '123456789',
  })
  @IsOptional()
  @IsString()
  orderId?: string;

  @ApiPropertyOptional({
    description: 'Original client order ID (either orderId or origClientOrderId must be provided)',
    example: 'myOrder1',
  })
  @IsOptional()
  @IsString()
  origClientOrderId?: string;

  @ApiPropertyOptional({
    description: 'New client order ID for the cancel operation',
    example: 'cancelMyOrder1',
  })
  @IsOptional()
  @IsString()
  newClientOrderId?: string;
}
