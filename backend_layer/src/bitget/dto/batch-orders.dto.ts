import { IsString, IsOptional, IsArray, IsEnum, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BatchOrderDto {
  @ApiPropertyOptional({ description: 'Trading pair name, e.g. BTCUSDT' })
  @IsOptional()
  @IsString()
  symbol?: string;

  @ApiProperty({ description: 'Order Direction', enum: ['buy', 'sell'] })
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

  @ApiProperty({ description: 'Amount' })
  @IsString()
  size: string;

  @ApiPropertyOptional({ description: 'Customed order ID' })
  @IsOptional()
  @IsString()
  clientOid?: string;

  @ApiPropertyOptional({ description: 'STP Mode', enum: ['none', 'cancel_taker', 'cancel_maker', 'cancel_both'] })
  @IsOptional()
  @IsEnum(['none', 'cancel_taker', 'cancel_maker', 'cancel_both'])
  stpMode?: 'none' | 'cancel_taker' | 'cancel_maker' | 'cancel_both';

  @ApiPropertyOptional({ description: 'Take profit price' })
  @IsOptional()
  @IsString()
  presetTakeProfitPrice?: string;

  @ApiPropertyOptional({ description: 'Take profit execute price' })
  @IsOptional()
  @IsString()
  executeTakeProfitPrice?: string;

  @ApiPropertyOptional({ description: 'Stop loss price' })
  @IsOptional()
  @IsString()
  presetStopLossPrice?: string;

  @ApiPropertyOptional({ description: 'Stop loss execute price' })
  @IsOptional()
  @IsString()
  executeStopLossPrice?: string;
}

export class BatchBitgetOrdersDto {
  @ApiPropertyOptional({ description: 'Trading pair name, e.g. BTCUSDT' })
  @IsOptional()
  @IsString()
  symbol?: string;

  @ApiPropertyOptional({ description: 'Batch order mode', enum: ['single', 'multiple'] })
  @IsOptional()
  @IsEnum(['single', 'multiple'])
  batchMode?: 'single' | 'multiple';

  @ApiProperty({ description: 'Collection of placing orders, maximum length: 50', type: [BatchOrderDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BatchOrderDto)
  orderList: BatchOrderDto[];
}

export class BatchOrderSuccessDto {
  @ApiProperty({ description: 'Order ID' })
  @IsString()
  orderId: string;

  @ApiProperty({ description: 'Client Order ID' })
  @IsString()
  clientOid: string;
}

export class BatchOrderFailureDto {
  @ApiProperty({ description: 'Order ID' })
  @IsString()
  orderId: string;

  @ApiProperty({ description: 'Client Order ID' })
  @IsString()
  clientOid: string;

  @ApiProperty({ description: 'Error information' })
  @IsString()
  errorMsg: string;

  @ApiProperty({ description: 'Error code' })
  @IsString()
  errorCode: string;
}

export class BatchOrdersResponseDto {
  @ApiProperty({ description: 'Successful order number', type: [BatchOrderSuccessDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BatchOrderSuccessDto)
  successList: BatchOrderSuccessDto[];

  @ApiProperty({ description: 'Failed order number', type: [BatchOrderFailureDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BatchOrderFailureDto)
  failureList: BatchOrderFailureDto[];
}

export class BatchCancelOrderItemDto {
  @ApiPropertyOptional({ description: 'Trading pair name, e.g. BTCUSDT' })
  @IsOptional()
  @IsString()
  symbol?: string;

  @ApiPropertyOptional({ description: 'Order ID. Either orderId or clientOid is required.' })
  @IsOptional()
  @IsString()
  orderId?: string;

  @ApiPropertyOptional({ description: 'Client Order ID. Either clientOid or orderId is required.' })
  @IsOptional()
  @IsString()
  clientOid?: string;
}

export class BatchCancelOrdersDto {
  @ApiPropertyOptional({ description: 'Trading pair name, e.g. BTCUSDT' })
  @IsOptional()
  @IsString()
  symbol?: string;

  @ApiPropertyOptional({ description: 'Batch order mode', enum: ['single', 'multiple'] })
  @IsOptional()
  @IsEnum(['single', 'multiple'])
  batchMode?: 'single' | 'multiple';

  @ApiProperty({ description: 'Order ID List, maximum length: 50', type: [BatchCancelOrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BatchCancelOrderItemDto)
  orderList: BatchCancelOrderItemDto[];
}