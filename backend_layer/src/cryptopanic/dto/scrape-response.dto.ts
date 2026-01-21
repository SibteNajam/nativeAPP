import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NewsItemDto } from '../dto/news-item.dto';

export class PanicScoreStatsDto {
  @ApiProperty({ description: 'Minimum PanicScore found', example: 10 })
  min: number;

  @ApiProperty({ description: 'Maximum PanicScore found', example: 95 })
  max: number;

  @ApiProperty({ description: 'Average PanicScore', example: 52.5 })
  avg: number;

  @ApiProperty({ description: 'Median PanicScore', example: 48 })
  median: number;

  @ApiProperty({ description: 'Count of items with PanicScore', example: 25 })
  count: number;

  @ApiProperty({ description: 'Standard deviation of PanicScores', example: 18.5 })
  stdDev: number;
}

export class ScrapingStatsDto {
  @ApiProperty({ description: 'Total items scraped across all filters', example: 150 })
  totalItems: number;

  @ApiProperty({ description: 'Items with PanicScore values', example: 89 })
  itemsWithPanicScore: number;

  @ApiProperty({ description: 'Percentage of items with PanicScore', example: 59.3 })
  panicScorePercentage: number;

  @ApiProperty({ description: 'Unique news sources found', example: 12 })
  uniqueSources: number;

  @ApiProperty({
    description: 'Sentiment distribution across all items',
    example: { bullish: 45, bearish: 32, neutral: 73 },
  })
  sentimentDistribution: Record<string, number>;

  @ApiProperty({ description: 'Detailed PanicScore statistics', type: PanicScoreStatsDto })
  panicScoreStats: PanicScoreStatsDto;

  @ApiProperty({
    description: 'Items count per filter used',
    example: { hot: 50, rising: 48, bullish: 52 },
  })
  itemsPerFilter: Record<string, number>;

  @ApiProperty({
    description: 'Top 5 sources by article count',
    example: [
      { source: 'CoinDesk', count: 23 },
      { source: 'Cointelegraph', count: 18 },
    ],
  })
  topSources: Array<{ source: string; count: number }>;
}

export class ScrapeResponseDto {
  @ApiProperty({ description: 'Success status', example: true })
  success: boolean;

  @ApiProperty({ description: 'Response message', example: 'Successfully scraped 150 items with PanicScore data' })
  message: string;

  @ApiProperty({ 
    description: 'All scraped news items sorted by PanicScore', 
    type: [NewsItemDto] 
  })
  data: NewsItemDto[];

  @ApiProperty({ 
    description: 'High-value news items (PanicScore > 70)', 
    type: [NewsItemDto] 
  })
  highValueNews: NewsItemDto[];

  @ApiProperty({ 
    description: 'Trending news items (PanicScore > 50)', 
    type: [NewsItemDto] 
  })
  trendingNews: NewsItemDto[];

  @ApiProperty({ description: 'Comprehensive scraping and PanicScore statistics', type: ScrapingStatsDto })
  stats: ScrapingStatsDto;

  @ApiProperty({ description: 'Filters that were processed', example: ['hot', 'rising', 'bullish'] })
  filtersProcessed: string[];

  @ApiProperty({ description: 'Request timestamp', example: '2025-08-28T09:56:27Z' })
  timestamp: string;

  @ApiPropertyOptional({ description: 'Total processing time in milliseconds', example: 45000 })
  processingTimeMs?: number;

  @ApiProperty({ description: 'Recommendations based on PanicScore analysis' })
  recommendations: {
    topStory: NewsItemDto | null;
    emergingTrends: NewsItemDto[];
    watchList: NewsItemDto[];
  };
}