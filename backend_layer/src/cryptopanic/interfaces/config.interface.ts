export interface ScraperConfig {
  baseUrl: string;
  headless: boolean;
  delay: number;
  pageLoadTimeout: number;
  elementWaitTimeout: number;
  userAgent: string;
  maxRetries: number;
  retryDelay: number;
}

export interface PuppeteerOptions {
  headless: boolean;
  args: string[];
  defaultViewport: {
    width: number;
    height: number;
  };
}