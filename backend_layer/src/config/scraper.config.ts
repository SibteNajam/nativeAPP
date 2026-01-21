import { registerAs } from '@nestjs/config';
import { ScraperConfig } from '../cryptopanic/interfaces/config.interface';

export default registerAs('scraper', (): ScraperConfig => ({
  baseUrl: process.env.CRYPTOPANIC_BASE_URL || 'https://cryptopanic.com',
  headless: process.env.PUPPETEER_HEADLESS !== 'false',
  delay:  3000,
  pageLoadTimeout:  30000,
  elementWaitTimeout:  15000,
  userAgent: process.env.USER_AGENT || 
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  maxRetries: 3,
  retryDelay: 5000,
}));