import { IsString, IsNumber, IsOptional, IsIn, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PlaceSpotOrderDto {
  @ApiProperty({ description: 'Trading pair, e.g., BTCUSDT' })
  @IsString()
  symbol: string;

  @ApiProperty({ description: 'Order side', enum: ['buy', 'sell'] })
  @IsEnum(['buy', 'sell'])
  side: 'buy' | 'sell';

  @ApiProperty({ description: 'Order type', enum: ['limit', 'market'] })
  @IsEnum(['limit', 'market'])
  orderType: 'limit' | 'market';

  @ApiProperty({ description: 'Execution strategy', enum: ['gtc', 'post_only', 'fok', 'ioc'] })
  @IsEnum(['gtc', 'post_only', 'fok', 'ioc'])
  force: 'gtc' | 'post_only' | 'fok' | 'ioc';

  @ApiPropertyOptional({ description: 'Limit price' })
  @IsOptional()
  @IsString()
  price?: string;

  @ApiProperty({ description: 'Order size' })
  @IsString()
  size: string;

  @ApiPropertyOptional({ description: 'Client order ID' })
  @IsOptional()
  @IsString()
  clientOid?: string;


  @IsOptional()
  @IsString()
  presetTakeProfitPrice?: string;

  @IsOptional()
  @IsString()
  executeTakeProfitPrice?: string;

  @IsOptional()
  @IsString()
  presetStopLossPrice?: string;

  @IsOptional()
  @IsString()
  executeStopLossPrice?: string;
}
