import { IsArray, IsNotEmpty, IsObject, IsString, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

export interface OpenInterestData {
  Exchange: string;
  'Open Interest ($)': string;
  '24H Change': string;
}

export class OpenInterestDto {
  symbol: string;
  data: OpenInterestData[];
  last_updated: string;
}




// Fund Flow Analysis item
export class FundFlowAnalysisItem {
  @IsString()
  @IsNotEmpty()
  'Order Size': string;

  @IsString()
  'Net Inflow ($)': string;

  @IsString()
  'Inflow ($)': string;

  @IsString()
  'Outflow ($)': string;
}

// Fund Flow Historical item
export class FundFlowHistoricalItem {
  @IsString()
  @IsNotEmpty()
  'Date': string;

  @IsString()
  'Inflow ($)': string;

  @IsString()
  'Outflow ($)': string;

  @IsString()
  'Net Inflow ($)': string;
}

// Fund Flow main DTO
export class FundFlowDto {
  @IsString()
  @IsNotEmpty()
  symbol: string;

  @IsString()
  @IsNotEmpty()
  market_type: string;  // 'spot' or 'future'

  @IsString()
  @IsNotEmpty()
  timeframe: string;    // '5M', '30M', '1H', '1D'

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FundFlowAnalysisItem)
  analysis: FundFlowAnalysisItem[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FundFlowHistoricalItem)
  historical: FundFlowHistoricalItem[];

  @IsString()
  @IsNotEmpty()
  last_updated: string;
}


//--------------------- longshor dto -----------------------

// Exchange item
export class LongShortExchangeItem {
  @IsString()
  Exchange: string;

  @IsString()
  Bias: string;

  @IsString()
  Long: string;  

  @IsString()
  Short: string;

}

// Main DTO
export class LongShortRatioDto {
  @IsString()
  symbol: string;

  @IsString()
  timeframe: string;

  @ValidateNested()
  @Type(() => Object)
  overall: {
    Long: string;
    Short: string;
  };

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LongShortExchangeItem)
  table: LongShortExchangeItem[];

  @IsString()
  last_updated: string;
}