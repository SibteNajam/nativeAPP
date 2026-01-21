import { IsString, IsNumber, IsEnum, IsArray, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export enum ExchangeType {
  BINANCE = 'BINANCE',
  BITGET = 'BITGET',
  GATEIO = 'GATEIO',
  MEXC = 'MEXC',
  BLOFIN = 'BLOFIN',
}

export enum OrderAction {
  BUY = 'BUY',
  SELL = 'SELL',
}

export class OrderMetaDto {
  @IsOptional()
  @IsString()
  macroSentiment?: string;

  @IsOptional()
  @IsNumber()
  macroConfMultiplier?: number;

  @IsOptional()
  @IsNumber()
  riskLiqMultiplier?: number;

  @IsOptional()
  @IsNumber()
  baseSize?: number;

  @IsOptional()
  @IsNumber()
  macroAdjustedSize?: number;

  @IsOptional()
  @IsNumber()
  finalSize?: number;
}

export class PlaceOrderDto {
  @IsString()
  symbol: string;

  @IsEnum(OrderAction)
  action: OrderAction;

  @IsNumber()
  sizePct: number; // Percentage of available capital (0-1) - BACKWARD COMPATIBLE

  @IsOptional()
  @IsNumber()
  sizeUsd?: number; // Absolute USD size - NEW: preferred over sizePct

  @IsArray()
  @IsNumber({}, { each: true })
  tpLevels: number[]; // Take profit levels

  @IsNumber()
  sl: number; // Stop loss

  @IsEnum(ExchangeType)
  exchange: ExchangeType;

  @IsOptional()
  @IsNumber()
  confidence?: number;

  @IsOptional()
  @IsString()
  explanation?: string;

  @IsOptional()
  @IsString()
  policyVersion?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => OrderMetaDto)
  meta?: OrderMetaDto; // NEW: Macro risk metadata
}
