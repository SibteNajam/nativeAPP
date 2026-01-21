export interface NewsItem {
  title: string;
  url: string;
  panicScore?: number;
  timestamp?: string;
  sentiment: string[];
  source?: string;
  votes: {
    up: number;
    down: number;
    total: number;
  };
  scrapedAt: string;
  filterType?: string;
}

export interface ScrapingStats {
  totalItems: number;
  itemsWithPanicScore: number;
  uniqueSources: number;
  sentimentDistribution: Record<string, number>;
  panicScoreStats: {
    min?: number;
    max?: number;
    avg?: number;
    count: number;
  };
}