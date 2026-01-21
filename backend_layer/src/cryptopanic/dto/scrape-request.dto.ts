import { IsOptional, IsString, IsArray, IsNumber, Min, Max, IsBoolean, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum FilterType {
  ALL = 'all',
  HOT = 'hot',
  RISING = 'rising',
  BULLISH = 'bullish',
  BEARISH = 'bearish',
  IMPORTANT = 'important',
  LOL = 'lol',
  COMMENTED = 'commented',
}

export class ScrapeRequestDto {
  @ApiPropertyOptional({
    description: 'Primary filter type for news (if not using multiple filters)',
    enum: FilterType,
    default: FilterType.ALL,
  })
  @IsOptional()
  @IsEnum(FilterType)
  filter?: FilterType = FilterType.ALL;

  @ApiPropertyOptional({
    description: 'Array of filters to scrape (overrides single filter)',
    enum: FilterType,
    isArray: true,
    example: [FilterType.HOT, FilterType.RISING, FilterType.BULLISH],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(FilterType, { each: true })
  filters?: FilterType[];

  @ApiPropertyOptional({
    description: 'Maximum number of items to scrape per filter',
    minimum: 1,
    maximum: 100,
    default: 50,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  maxItems?: number = 50;

  @ApiPropertyOptional({
    description: 'Whether to enable PanicScore (always recommended)',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  enablePanicScore?: boolean = true;

  @ApiPropertyOptional({
    description: 'Delay between requests in milliseconds',
    minimum: 1000,
    maximum: 10000,
    default: 3000,
  })
  @IsOptional()
  @IsNumber()
  @Min(1000)
  @Max(10000)
  delay?: number = 3000;

  @ApiPropertyOptional({
    description: 'Minimum PanicScore to include in results',
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  minPanicScore?: number;

  @ApiPropertyOptional({
    description: 'Whether to sort results by PanicScore (highest first)',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  sortByPanicScore?: boolean = true;
}