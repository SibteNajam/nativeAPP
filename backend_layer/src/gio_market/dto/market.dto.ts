import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsBoolean, IsOptional, IsArray, ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class SpotCurrencyChainDto {
  @ApiProperty({ description: 'Blockchain name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Token address' })
  @IsOptional()
  @IsString()
  addr?: string;

  @ApiProperty({ description: "Whether currency's withdrawal is disabled" })
  @IsBoolean()
  withdraw_disabled: boolean;

  @ApiProperty({ description: "Whether currency's withdrawal is delayed" })
  @IsBoolean()
  withdraw_delayed: boolean;

  @ApiProperty({ description: "Whether currency's deposit is disabled" })
  @IsBoolean()
  deposit_disabled: boolean;
}

export class SpotCurrencyDto {
  @ApiProperty({ description: 'Currency symbol' })
  @IsString()
  currency: string;

  @ApiProperty({ description: 'Currency name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Whether currency is de-listed' })
  @IsBoolean()
  delisted: boolean;

  @ApiProperty({ description: "Whether withdrawal is suspended (deprecated)" })
  @IsBoolean()
  withdraw_disabled: boolean;

  @ApiProperty({ description: "Whether withdrawal has delay (deprecated)" })
  @IsBoolean()
  withdraw_delayed: boolean;

  @ApiProperty({ description: "Whether deposit is suspended (deprecated)" })
  @IsBoolean()
  deposit_disabled: boolean;

  @ApiProperty({ description: "Whether currency's trading is disabled" })
  @IsBoolean()
  trade_disabled: boolean;

  @ApiPropertyOptional({ description: 'Fixed fee rate (for fixed rate currencies)' })
  @IsOptional()
  @IsString()
  fixed_rate?: string;

  @ApiPropertyOptional({ description: 'The main chain corresponding to the coin' })
  @IsOptional()
  @IsString()
  chain?: string;

  @ApiProperty({ description: 'All chains corresponding to the currency', type: [SpotCurrencyChainDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SpotCurrencyChainDto)
  chains: SpotCurrencyChainDto[];
}

export class SpotCurrencyPairDto {
  @ApiProperty({ description: 'Trading pair id' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'Base currency' })
  @IsString()
  base: string;

  @ApiProperty({ description: 'Base currency name' })
  @IsString()
  base_name: string;

  @ApiProperty({ description: 'Quote currency' })
  @IsString()
  quote: string;

  @ApiProperty({ description: 'Quote currency name' })
  @IsString()
  quote_name: string;

  @ApiPropertyOptional({ description: 'Trading fee rate (deprecated)' })
  @IsOptional()
  @IsString()
  fee?: string;

  @ApiPropertyOptional({ description: 'Minimum amount of base currency to trade' })
  @IsOptional()
  @IsString()
  min_base_amount?: string;

  @ApiPropertyOptional({ description: 'Minimum amount of quote currency to trade' })
  @IsOptional()
  @IsString()
  min_quote_amount?: string;

  @ApiPropertyOptional({ description: 'Maximum amount of base currency to trade' })
  @IsOptional()
  @IsString()
  max_base_amount?: string;

  @ApiPropertyOptional({ description: 'Maximum amount of quote currency to trade' })
  @IsOptional()
  @IsString()
  max_quote_amount?: string;

  @ApiProperty({ description: 'Amount precision' })
  @IsNumber()
  amount_precision: number;

  @ApiProperty({ description: 'Price precision' })
  @IsNumber()
  precision: number;

  @ApiProperty({ description: 'Trading status' })
  @IsString()
  trade_status: string;

  @ApiPropertyOptional({ description: 'Sell start unix timestamp in seconds' })
  @IsOptional()
  @IsNumber()
  sell_start?: number;

  @ApiPropertyOptional({ description: 'Buy start unix timestamp in seconds' })
  @IsOptional()
  @IsNumber()
  buy_start?: number;

  @ApiPropertyOptional({ description: 'Expected time to remove from shelves, unix timestamp in seconds' })
  @IsOptional()
  @IsNumber()
  delisting_time?: number;

  @ApiPropertyOptional({ description: 'Transaction link' })
  @IsOptional()
  @IsString()
  trade_url?: string;

  @ApiPropertyOptional({ description: 'Whether in ST risk assessment' })
  @IsOptional()
  withdraw_disabled?: boolean;
}
