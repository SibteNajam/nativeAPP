import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class VotesDto {
  @ApiProperty({ description: 'Upvotes count', example: 5 })
  up: number;

  @ApiProperty({ description: 'Downvotes count', example: 1 })
  down: number;

  @ApiProperty({ description: 'Total votes count', example: 6 })
  total: number;
}

export class NewsItemDto {
  @ApiProperty({ description: 'News article title', example: 'Bitcoin Reaches New High' })
  title: string;

  @ApiProperty({ description: 'News article URL', example: 'https://example.com/bitcoin-news' })
  url: string;

  @ApiPropertyOptional({ description: 'PanicScore value', example: 85 })
  panicScore?: number;

  @ApiPropertyOptional({ description: 'Article timestamp', example: '2025-01-15T10:30:00Z' })
  timestamp?: string;

  @ApiProperty({ description: 'Sentiment tags', example: ['bullish', 'positive'], type: [String] })
  sentiment: string[];

  @ApiPropertyOptional({ description: 'News source', example: 'CoinDesk' })
  source?: string;

  @ApiProperty({ description: 'Vote counts', type: VotesDto })
  votes: VotesDto;

  @ApiProperty({ description: 'When the item was scraped', example: '2025-01-15T10:35:00Z' })
  scrapedAt: string;

  @ApiPropertyOptional({ description: 'Filter type used', example: 'hot' })
  filterType?: string;
}