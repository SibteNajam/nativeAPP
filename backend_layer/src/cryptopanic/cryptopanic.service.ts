// import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
// import { ConfigService } from '@nestjs/config';
// import * as puppeteer from 'puppeteer';
// import { Browser, Page } from 'puppeteer';
// import { NewsItem, ScrapingStats } from './interfaces/news-item.interface';
// import { ScraperConfig } from './interfaces/config.interface';
// import { ScrapeRequestDto, FilterType } from './dto/scrape-request.dto';
// import { ScrapeResponseDto } from './dto/scrape-response.dto';

// @Injectable()
// export class CryptoPanicService implements OnModuleDestroy {
//   private readonly logger = new Logger(CryptoPanicService.name);
//   private browser: Browser | null = null;
//   private readonly config: ScraperConfig;

//   constructor(private configService: ConfigService) {
   

//      this.config = this.configService.get<ScraperConfig>('scraper') || {
//       baseUrl: 'https://cryptopanic.com',
//       headless: true,
//       delay: 3000,
//       pageLoadTimeout: 30000,
//       elementWaitTimeout: 15000,
//       userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
//       maxRetries: 3,
//       retryDelay: 5000,
//     };

//     // Validate that we have a proper config
//     if (!this.config.baseUrl) {
//       throw new Error('Scraper configuration is invalid - missing baseUrl');
//     }
//   }

//   async onModuleDestroy() {
//     await this.closeBrowser();
//   }

//   private async initializeBrowser(): Promise<Browser> {
//     if (!this.browser) {
//       this.logger.log('Initializing Puppeteer browser...');
//       this.browser = await puppeteer.launch({
//         headless: this.config.headless,
//         args: [
//           '--no-sandbox',
//           '--disable-setuid-sandbox',
//           '--disable-dev-shm-usage',
//           '--disable-accelerated-2d-canvas',
//           '--no-first-run',
//           '--no-zygote',
//           '--disable-gpu',
//           '--disable-web-security',
//           '--disable-features=VizDisplayCompositor'
//         ],
//         defaultViewport: {
//           width: 1920,
//           height: 1080,
//         },
//       });
//     }
//     return this.browser;
//   }

//   private async closeBrowser(): Promise<void> {
//     if (this.browser) {
//       await this.browser.close();
//       this.browser = null;
//       this.logger.log('Browser closed');
//     }
//   }

//   private async createPage(): Promise<Page> {
//     const browser = await this.initializeBrowser();
//     const page = await browser.newPage();
    
//     await page.setUserAgent(this.config.userAgent);
//     await page.setViewport({ width: 1920, height: 1080 });
    
//     // Block unnecessary resources to speed up scraping
//     await page.setRequestInterception(true);
//     page.on('request', (req) => {
//       const resourceType = req.resourceType();
//       if (resourceType === 'stylesheet' || resourceType === 'font' || resourceType === 'image') {
//         req.abort();
//       } else {
//         req.continue();
//       }
//     });

//     return page;
//   }

//   private async enablePanicScore(page: Page): Promise<boolean> {
//     try {
//       this.logger.log('Attempting to enable PanicScore...');
      
//       // Wait for the panic score toggle
//       await page.waitForSelector('#hotmeter', { timeout: 10000 });
      
//       // Check if already enabled by checking the switch state
//       const isEnabled = await page.evaluate(() => {
//         const switchCore = document.querySelector('.v-switch-core');
//         if (switchCore) {
//           const bgColor = window.getComputedStyle(switchCore).backgroundColor;
//           return !bgColor.includes('191, 203, 217'); // Gray color indicates disabled
//         }
//         return false;
//       });

//       if (!isEnabled) {
//         await page.click('#hotmeter');
//         await new Promise(resolve => setTimeout(resolve, 3000)); // Wait longer for activation
//         this.logger.log('PanicScore enabled successfully');
//         return true;
//       } else {
//         this.logger.log('PanicScore already enabled');
//         return true;
//       }
//     } catch (error) {
//       this.logger.warn(`Could not enable PanicScore: ${error.message}`);
//       return false;
//     }
//   }

//   private async scrapeFilterData(filter: FilterType, maxItems: number, enablePanicScore: boolean): Promise<NewsItem[]> {
//     const page = await this.createPage();
    
//     try {
//       let url = `${this.config.baseUrl}/news`;
//       if (filter !== FilterType.ALL) {
//         url += `?filter=${filter}`;
//       }

//       this.logger.log(`Scraping filter ${filter}: ${url}`);
      
//       await page.goto(url, { 
//         waitUntil: 'networkidle2',
//         timeout: this.config.pageLoadTimeout 
//       });

//       // Wait for initial page load
//       await new Promise(resolve => setTimeout(resolve, this.config.delay));

//       // Enable PanicScore if requested
//       let panicScoreEnabled = false;
//       if (enablePanicScore) {
//         panicScoreEnabled = await this.enablePanicScore(page);
//         if (panicScoreEnabled) {
//           await new Promise(resolve => setTimeout(resolve, 5000)); // Wait for PanicScore data to fully load
//         }
//       }

//       // Extract news data
//       const newsData = await this.extractNewsData(page, maxItems);
      
//       // Add filter type to each item
//       return newsData.map(item => ({ 
//         ...item, 
//         filterType: filter,
//         panicScoreEnabled 
//       }));
      
//     } catch (error) {
//       this.logger.error(`Error scraping filter ${filter}: ${error.message}`);
//       return [];
//     } finally {
//       await page.close();
//     }
//   }

//   private async extractNewsData(page: Page, maxItems: number): Promise<NewsItem[]> {
//     this.logger.log('Extracting news data...');
    
//     try {
//       // Wait for news items to load
//       await page.waitForSelector('.news-row, .post-row, [class*="news"], [class*="post"]', 
//         { timeout: this.config.elementWaitTimeout });

//       const newsData = await page.evaluate((maxItems) => {
//         const newsItems = Array.from(document.querySelectorAll('.news-row, .post-row, [class*="news"], [class*="post"]'))
//           .slice(0, maxItems);
        
//         return newsItems.map((item) => {
//           try {
//             // Extract title
//             const titleElem = item.querySelector('h3, h2, .title, [class*="title"] a, .news-title, .post-title');
//             const title = titleElem?.textContent?.trim() || 'No title';

//             // Extract URL
//             const linkElem = item.querySelector('a[href]');
//             let url = linkElem?.getAttribute('href') || '';
//             if (url && !url.startsWith('http')) {
//               url = 'https://cryptopanic.com' + url;
//             }

//             // Extract PanicScore with enhanced selectors
//             const extractPanicScore = () => {
//               const scoreSelectors = [
//                 '.panic-score', '.score', '[class*="panic"]', '[class*="score"]',
//                 '.flame', '[data-score]', '.hotmeter-score', '.panic-value',
//                 '.score-value', '[class*="flame"]', '.hot-score'
//               ];
              
//               for (const selector of scoreSelectors) {
//                 const scoreElem = item.querySelector(selector);
//                 if (scoreElem) {
//                   const scoreText = scoreElem.textContent?.trim() || '';
//                   const scoreData = scoreElem.getAttribute('data-score') || '';
//                   const titleAttr = scoreElem.getAttribute('title') || '';
                  
//                   for (const text of [scoreText, scoreData, titleAttr]) {
//                     if (text && /^\d+$/.test(text)) {
//                       return parseInt(text);
//                     }
//                     const numbers = text.match(/\d+/);
//                     if (numbers && parseInt(numbers[0]) <= 100) {
//                       return parseInt(numbers[0]);
//                     }
//                   }
//                 }
//               }
              
//               // Check for flame icon intensity or color indicators
//               const flameElem = item.querySelector('[class*="flame"], .icon-flame');
//               if (flameElem) {
//                 const classNames = flameElem.className;
//                 if (classNames.includes('high')) return 80;
//                 if (classNames.includes('medium')) return 50;
//                 if (classNames.includes('low')) return 20;
//               }
              
//               return null;
//             };

//             // Extract timestamp
//             const extractTimestamp = () => {
//               const timeSelectors = ['time', '.timestamp', '.time', '.date', '[datetime]', '[data-time]', '.news-time'];
//               for (const selector of timeSelectors) {
//                 const timeElem = item.querySelector(selector);
//                 if (timeElem) {
//                   return timeElem.getAttribute('datetime') ||
//                          timeElem.getAttribute('data-time') ||
//                          timeElem.textContent?.trim();
//                 }
//               }
//               return null;
//             };

//             // Extract sentiment with enhanced detection
//             const extractSentiment = () => {
//               const sentimentTags: string[] = [];
//               const tagSelectors = [
//                 '.tag', '.label', '.badge', '[class*="bullish"]', '[class*="bearish"]',
//                 '[class*="positive"]', '[class*="negative"]', '.sentiment', '.mood'
//               ];
              
//               for (const selector of tagSelectors) {
//                 const tags = item.querySelectorAll(selector);
//                 tags.forEach(tag => {
//                   const tagText = tag.textContent?.trim().toLowerCase();
//                   if (tagText && ['bullish', 'bearish', 'positive', 'negative', 'neutral', 'hot', 'rising'].includes(tagText)) {
//                     sentimentTags.push(tagText);
//                   }
//                 });
//               }
              
//               // Check for color-based sentiment indicators
//               const colorElems = item.querySelectorAll('[class*="green"], [class*="red"], [class*="bull"], [class*="bear"]');
//               colorElems.forEach(elem => {
//                 const className = elem.className.toLowerCase();
//                 if (className.includes('green') || className.includes('bull')) sentimentTags.push('bullish');
//                 if (className.includes('red') || className.includes('bear')) sentimentTags.push('bearish');
//               });
              
//               return [...new Set(sentimentTags)]; // Remove duplicates
//             };

//             // Extract source
//             const extractSource = () => {
//               const sourceSelectors = ['.source', '.author', '.domain', '[class*="source"]', '.news-source', '.publisher'];
//               for (const selector of sourceSelectors) {
//                 const sourceElem = item.querySelector(selector);
//                 if (sourceElem) {
//                   return sourceElem.textContent?.trim();
//                 }
//               }
//               return null;
//             };

//             // Extract votes
//             const extractVotes = () => {
//               const votes = { up: 0, down: 0, total: 0 };
//               const voteSelectors = ['.votes', '.vote-count', '[class*="vote"]', '.upvotes', '.points'];
              
//               for (const selector of voteSelectors) {
//                 const voteElem = item.querySelector(selector);
//                 if (voteElem) {
//                   const voteText = voteElem.textContent?.trim() || '';
//                   const numbers = voteText.match(/\d+/);
//                   if (numbers) {
//                     votes.total = parseInt(numbers[0]);
//                   }
//                   break;
//                 }
//               }
//               return votes;
//             };

//             const newsItem = {
//               title,
//               url,
//               panicScore: extractPanicScore(),
//               timestamp: extractTimestamp(),
//               sentiment: extractSentiment(),
//               source: extractSource(),
//               votes: extractVotes(),
//               scrapedAt: new Date().toISOString(),
//             };

//             return newsItem;
//           } catch (error) {
//             console.error('Error extracting news item:', error);
//             return null;
//           }
//         }).filter(item => item !== null);
//       }, maxItems);

//       this.logger.log(`Extracted ${newsData.length} news items`);
//       // Convert panicScore: null to undefined and timestamp: null to undefined for type compatibility
//       const sanitizedNewsData = newsData.map(item => ({
//         ...item,
//         panicScore: item.panicScore === null ? undefined : item.panicScore,
//         timestamp: item.timestamp === null ? undefined : item.timestamp,
//         source: item.source === null ? undefined : item.source,
//       }));
//       return sanitizedNewsData;
//     } catch (error) {
//       this.logger.error(`Error extracting news data: ${error.message}`);
//       return [];
//     }
//   }

//   private calculateAdvancedStats(data: NewsItem[]): any {
//     const stats = {
//       totalItems: data.length,
//       itemsWithPanicScore: data.filter(item => item.panicScore !== undefined && item.panicScore !== null).length,
//       panicScorePercentage: 0,
//       uniqueSources: new Set(data.map(item => item.source).filter(Boolean)).size,
//       sentimentDistribution: {},
//       panicScoreStats: { min: 0, max: 0, avg: 0, median: 0, count: 0, stdDev: 0 },
//       itemsPerFilter: {},
//       topSources: [] as { source: string; count: number | undefined }[],
//     };

//     // Calculate panic score percentage
//     stats.panicScorePercentage = stats.totalItems > 0 
//       ? Math.round((stats.itemsWithPanicScore / stats.totalItems) * 100 * 100) / 100 
//       : 0;

//     // Calculate sentiment distribution
//     const allSentiments = data.flatMap(item => item.sentiment || []);
//     for (const sentiment of allSentiments) {
//       stats.sentimentDistribution[sentiment] = (stats.sentimentDistribution[sentiment] || 0) + 1;
//     }

//     // Calculate items per filter
//     for (const item of data) {
//       const filter = item.filterType || 'unknown';
//       stats.itemsPerFilter[filter] = (stats.itemsPerFilter[filter] || 0) + 1;
//     }

//     // Calculate advanced PanicScore statistics
//     const panicScores = data
//       .map(item => item.panicScore)
//       .filter(score => score !== undefined && score !== null) as number[];

//     if (panicScores.length > 0) {
//       const sorted = panicScores.sort((a, b) => a - b);
//       const sum = panicScores.reduce((acc, score) => acc + score, 0);
//       const avg = sum / panicScores.length;
      
//       // Calculate standard deviation
//       const variance = panicScores.reduce((acc, score) => acc + Math.pow(score - avg, 2), 0) / panicScores.length;
//       const stdDev = Math.sqrt(variance);

//       stats.panicScoreStats = {
//         min: Math.min(...panicScores),
//         max: Math.max(...panicScores),
//         avg: Math.round(avg * 100) / 100,
//         median: sorted[Math.floor(sorted.length / 2)],
//         count: panicScores.length,
//         stdDev: Math.round(stdDev * 100) / 100,
//       };
//     }

//     // Calculate top sources
//     const sourceCounts = {};
//     for (const item of data) {
//       if (item.source) {
//         sourceCounts[item.source] = (sourceCounts[item.source] || 0) + 1;
//       }
//     }
    
//     stats.topSources = Object.entries(sourceCounts)
//       .map(([source, count]) => ({ source, count: count as number }))
//       .sort((a, b) => (b.count as number) - (a.count as number))
//       .slice(0, 5);

//     return stats;
//   }

//   private generateRecommendations(data: NewsItem[]): any {
//     // Sort by panic score for analysis
//     const sortedByPanicScore = data
//       .filter(item => item.panicScore !== undefined && item.panicScore !== null)
//       .sort((a, b) => (b.panicScore || 0) - (a.panicScore || 0));

//     return {
//       topStory: sortedByPanicScore[0] || null,
//       emergingTrends: sortedByPanicScore
//         .filter(item => (item.panicScore || 0) >= 60 && (item.panicScore || 0) < 80)
//         .slice(0, 5),
//       watchList: sortedByPanicScore
//         .filter(item => (item.panicScore || 0) >= 40 && (item.panicScore || 0) < 60)
//         .slice(0, 10),
//     };
//   }

//   async scrapeAndProcessPanicScore(options: ScrapeRequestDto): Promise<ScrapeResponseDto> {
//     const startTime = Date.now();
    
//     try {
//       // Determine which filters to use
//       const filtersToProcess = options.filters && options.filters.length > 0 
//         ? options.filters 
//         : [options.filter || FilterType.ALL];

//       this.logger.log(`Processing filters: ${filtersToProcess.join(', ')}`);

//       // Scrape all filters
//       const allData: NewsItem[] = [];
//       const filtersProcessed: string[] = [];

//       for (const filter of filtersToProcess) {
//         try {
//           const filterData = await this.scrapeFilterData(
//             filter, 
//             options.maxItems || 50, 
//             options.enablePanicScore !== false
//           );
          
//           allData.push(...filterData);
//           filtersProcessed.push(filter);
          
//           this.logger.log(`Successfully scraped ${filterData.length} items for filter: ${filter}`);
          
//           // Delay between filter requests
//           if (filtersToProcess.length > 1) {
//             await new Promise(resolve => setTimeout(resolve, options.delay || 3000));
//           }
          
//         } catch (error) {
//           this.logger.error(`Failed to scrape filter ${filter}: ${error.message}`);
//         }
//       }

//       // Remove duplicates based on URL
//       const uniqueData = allData.filter((item, index, self) => 
//         index === self.findIndex(other => other.url === item.url)
//       );

//       // Apply filters
//       let filteredData = uniqueData;

//       // Filter by minimum panic score if specified
//       if (options.minPanicScore !== undefined) {
//         filteredData = filteredData.filter(item => 
//           item.panicScore !== undefined && 
//           item.panicScore !== null && 
//           item.panicScore >= (options.minPanicScore || 0)
//         );
//       }

//       // Sort by panic score if requested
//       if (options.sortByPanicScore !== false) {
//         filteredData.sort((a, b) => {
//           const scoreA = a.panicScore || 0;
//           const scoreB = b.panicScore || 0;
//           return scoreB - scoreA; // Highest first
//         });
//       }

//       // Calculate comprehensive statistics
//       const stats = this.calculateAdvancedStats(filteredData);

//       // Generate categorized news
//       const highValueNews = filteredData.filter(item => (item.panicScore || 0) > 70);
//       const trendingNews = filteredData.filter(item => (item.panicScore || 0) > 50);

//       // Generate recommendations
//       const recommendations = this.generateRecommendations(filteredData);

//       const response: ScrapeResponseDto = {
//         success: true,
//         message: `Successfully scraped ${filteredData.length} unique items with PanicScore data from ${filtersProcessed.length} filters`,
//         data: filteredData,
//         highValueNews,
//         trendingNews,
//         stats,
//         filtersProcessed,
//         timestamp: new Date().toISOString(),
//         recommendations,
//       };

//       this.logger.log(`Scraping completed: ${filteredData.length} items processed in ${Date.now() - startTime}ms`);
      
//       return response;

//     } catch (error) {
//       this.logger.error(`Error in scrapeAndProcessPanicScore: ${error.message}`);
//       throw error;
//     }
//   }
// }


import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as puppeteer from 'puppeteer';
import { Browser, Page } from 'puppeteer';
import { NewsItem, ScrapingStats } from './interfaces/news-item.interface';
import { ScraperConfig } from './interfaces/config.interface';
import { ScrapeRequestDto, FilterType } from './dto/scrape-request.dto';
import { ScrapeResponseDto } from './dto/scrape-response.dto';

@Injectable()
export class CryptoPanicService implements OnModuleDestroy {
  private readonly logger = new Logger(CryptoPanicService.name);
  private browser: Browser | null = null;
  private readonly config: ScraperConfig;

  constructor(private configService: ConfigService) {
    this.config = this.configService.get<ScraperConfig>('scraper') || {
      baseUrl: 'https://cryptopanic.com',
      headless: false, // Set to false for debugging
      delay: 3000,
      pageLoadTimeout: 30000,
      elementWaitTimeout: 15000,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      maxRetries: 3,
      retryDelay: 5000,
    };

    if (!this.config.baseUrl) {
      throw new Error('Scraper configuration is invalid - missing baseUrl');
    }
  }

  async onModuleDestroy() {
    await this.closeBrowser();
  }

  private async initializeBrowser(): Promise<Browser> {
    if (!this.browser) {
      this.logger.log('Initializing Puppeteer browser...');
      this.browser = await puppeteer.launch({
        headless: this.config.headless,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--window-size=1920,1080'
        ],
        defaultViewport: {
          width: 1920,
          height: 1080,
        },
      });
    }
    return this.browser;
  }

  private async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.logger.log('Browser closed');
    }
  }

  private async createPage(): Promise<Page> {
    const browser = await this.initializeBrowser();
    const page = await browser.newPage();
    
    await page.setUserAgent(this.config.userAgent);
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Don't block resources for debugging - comment out for production
    // await page.setRequestInterception(true);
    // page.on('request', (req) => {
    //   const resourceType = req.resourceType();
    //   if (resourceType === 'stylesheet' || resourceType === 'font' || resourceType === 'image') {
    //     req.abort();
    //   } else {
    //     req.continue();
    //   }
    // });

    return page;
  }

  private async enablePanicScore(page: Page): Promise<boolean> {
    try {
      this.logger.log('Attempting to enable PanicScore...');
      
      // Wait for page to fully load first
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Try multiple selectors for the panic score toggle
      const toggleSelectors = [
        '#hotmeter',
        '.vue-js-switch',
        '[class*="hotmeter"]',
        '.hotmeter-tab',
        'label[id="hotmeter"]'
      ];
      
      let toggleFound = false;
      for (const selector of toggleSelectors) {
        try {
          await page.waitForSelector(selector, { timeout: 5000 });
          toggleFound = true;
          this.logger.log(`Found panic score toggle with selector: ${selector}`);
          break;
        } catch (e) {
          continue;
        }
      }
      
      if (!toggleFound) {
        this.logger.warn('Could not find panic score toggle');
        return false;
      }
      
      // Check if already enabled by checking the switch state
      const isEnabled = await page.evaluate(() => {
        const switchCore = document.querySelector('.v-switch-core');
        if (switchCore) {
          const bgColor = window.getComputedStyle(switchCore).backgroundColor;
          const isActive = !bgColor.includes('191, 203, 217'); // Gray color indicates disabled
          console.log('Switch background color:', bgColor, 'Is active:', isActive);
          return isActive;
        }
        return false;
      });

      if (!isEnabled) {
        // Try clicking the toggle
        try {
          await page.click('#hotmeter');
          await new Promise(resolve => setTimeout(resolve, 3000));
          this.logger.log('PanicScore toggle clicked');
        } catch (e) {
          this.logger.warn('Could not click panic score toggle');
        }
        
        // Verify if it was enabled
        const nowEnabled = await page.evaluate(() => {
          const switchCore = document.querySelector('.v-switch-core');
          if (switchCore) {
            const bgColor = window.getComputedStyle(switchCore).backgroundColor;
            return !bgColor.includes('191, 203, 217');
          }
          return false;
        });
        
        this.logger.log(`PanicScore enabled successfully: ${nowEnabled}`);
        return nowEnabled;
      } else {
        this.logger.log('PanicScore already enabled');
        return true;
      }
    } catch (error: any) {
      this.logger.warn(`Could not enable PanicScore: ${error.message}`);
      return false;
    }
  }

  private async scrapeFilterData(filter: FilterType, maxItems: number, enablePanicScore: boolean): Promise<NewsItem[]> {
    const page = await this.createPage();
    
    try {
      let url = `${this.config.baseUrl}/news`;
      if (filter !== FilterType.ALL) {
        url += `?filter=${filter}`;
      }

      this.logger.log(`Scraping filter ${filter}: ${url}`);
      
      await page.goto(url, { 
        waitUntil: 'networkidle2',
        timeout: this.config.pageLoadTimeout 
      });

      // Wait for initial page load
      await new Promise(resolve => setTimeout(resolve, this.config.delay));

      // Enable PanicScore if requested
      let panicScoreEnabled = false;
      if (enablePanicScore) {
        panicScoreEnabled = await this.enablePanicScore(page);
        if (panicScoreEnabled) {
          await new Promise(resolve => setTimeout(resolve, 8000)); // Wait longer for PanicScore data to fully load
        }
      }

      // Extract news data
      const newsData = await this.extractNewsData(page, maxItems);
      
      this.logger.log(`Scraped ${newsData.length} items for filter ${filter}`);
      
      // Add filter type to each item
      return newsData.map(item => ({ 
        ...item, 
        filterType: filter,
        panicScoreEnabled 
      }));
      
    } catch (error: any) {
      this.logger.error(`Error scraping filter ${filter}: ${error.message}`);
      return [];
    } finally {
      await page.close();
    }
  }

  private async extractNewsData(page: Page, maxItems: number): Promise<NewsItem[]> {
    this.logger.log('Extracting news data...');
    
    try {
      // Try multiple selectors for news items
      const newsSelectors = [
        '.news-row',
        '.post-row', 
        '[class*="news"]',
        '[class*="post"]',
        '.news-item',
        '.post-item',
        'article',
        '[data-cy="news-item"]'
      ];
      
      let itemsFound = false;
      for (const selector of newsSelectors) {
        try {
          await page.waitForSelector(selector, { timeout: 5000 });
          itemsFound = true;
          this.logger.log(`Found news items with selector: ${selector}`);
          break;
        } catch (e) {
          continue;
        }
      }
      
      if (!itemsFound) {
        this.logger.warn('Could not find any news items');
        // Take a screenshot for debugging
        await page.screenshot({ path: `debug-${Date.now()}.png`, fullPage: true });
        return [];
      }

      const newsData = await page.evaluate((maxItems) => {
        // Try multiple selectors
        const possibleSelectors = [
          '.news-row',
          '.post-row', 
          '[class*="news"]',
          '[class*="post"]',
          '.news-item',
          '.post-item',
          'article',
          '[data-cy="news-item"]'
        ];
        
        let newsItems: Element[] = [];
        for (const selector of possibleSelectors) {
          const items = Array.from(document.querySelectorAll(selector));
          if (items.length > 0) {
            newsItems = items;
            console.log(`Found ${items.length} items with selector: ${selector}`);
            break;
          }
        }
        
        if (newsItems.length === 0) {
          console.log('No news items found with any selector');
          return [];
        }
        
        const limitedItems = newsItems.slice(0, maxItems);
        console.log(`Processing ${limitedItems.length} items`);
        
        return limitedItems.map((item, index) => {
          try {
            console.log(`Processing item ${index + 1}`);
            
            // Extract title with multiple selectors
            const titleSelectors = [
              'h1', 'h2', 'h3', 'h4',
              '.title', '.news-title', '.post-title',
              '[class*="title"]',
              'a[class*="title"]',
              '.headline'
            ];
            
            let title = 'No title';
            for (const selector of titleSelectors) {
              const titleElem = item.querySelector(selector);
              if (titleElem?.textContent?.trim()) {
                title = titleElem.textContent.trim();
                break;
              }
            }

            // Extract URL
            const linkElem = item.querySelector('a[href]');
            let url = linkElem?.getAttribute('href') || '';
            if (url && !url.startsWith('http')) {
              url = 'https://cryptopanic.com' + url;
            }

            // Extract PanicScore with enhanced selectors and debugging
            const extractPanicScore = () => {
              const scoreSelectors = [
                '[class*="panic"]',
                '[class*="score"]',
                '[class*="flame"]',
                '[data-score]',
                '.hotmeter',
                '.panic-score',
                '.score',
                '.flame',
                '.hot-score',
                '.panic-value',
                '.score-value'
              ];
              
              for (const selector of scoreSelectors) {
                const scoreElems = item.querySelectorAll(selector);
                for (const scoreElem of scoreElems) {
                  if (scoreElem) {
                    const scoreText = scoreElem.textContent?.trim() || '';
                    const scoreData = scoreElem.getAttribute('data-score') || '';
                    const titleAttr = scoreElem.getAttribute('title') || '';
                    const ariaLabel = scoreElem.getAttribute('aria-label') || '';
                    
                    console.log(`Checking score element:`, {
                      selector,
                      scoreText,
                      scoreData,
                      titleAttr,
                      ariaLabel,
                      innerHTML: scoreElem.innerHTML
                    });
                    
                    for (const text of [scoreText, scoreData, titleAttr, ariaLabel]) {
                      if (text && /^\d+$/.test(text)) {
                        const score = parseInt(text);
                        console.log(`Found score: ${score}`);
                        return score;
                      }
                      const numbers = text.match(/\d+/);
                      if (numbers) {
                        const score = parseInt(numbers[0]);
                        if (score >= 0 && score <= 100) {
                          console.log(`Found score from text: ${score}`);
                          return score;
                        }
                      }
                    }
                  }
                }
              }
              
              // Check for flame icon intensity or color indicators
              const flameElem = item.querySelector('[class*="flame"], .icon-flame, svg[class*="flame"]');
              if (flameElem) {
                const classNames = flameElem.className;
                console.log('Found flame element with classes:', classNames);
                if (classNames.includes('high') || classNames.includes('red')) return 80;
                if (classNames.includes('medium') || classNames.includes('orange')) return 50;
                if (classNames.includes('low') || classNames.includes('yellow')) return 20;
                if (classNames.includes('enabled')) return 30; // Default for enabled flame
              }
              
              return null;
            };

            // Extract timestamp
            const extractTimestamp = () => {
              const timeSelectors = [
                'time', '.timestamp', '.time', '.date', 
                '[datetime]', '[data-time]', '.news-time',
                '.timeago', '.published', '.created'
              ];
              for (const selector of timeSelectors) {
                const timeElem = item.querySelector(selector);
                if (timeElem) {
                  return timeElem.getAttribute('datetime') ||
                         timeElem.getAttribute('data-time') ||
                         timeElem.textContent?.trim();
                }
              }
              return null;
            };

            // Extract sentiment with enhanced detection
            const extractSentiment = () => {
              const sentimentTags: string[] = [];
              const tagSelectors = [
                '.tag', '.label', '.badge', '.chip',
                '[class*="bullish"]', '[class*="bearish"]',
                '[class*="positive"]', '[class*="negative"]', 
                '.sentiment', '.mood', '.vote-type'
              ];
              
              for (const selector of tagSelectors) {
                const tags = item.querySelectorAll(selector);
                tags.forEach(tag => {
                  const tagText = tag.textContent?.trim().toLowerCase();
                  if (tagText && ['bullish', 'bearish', 'positive', 'negative', 'neutral', 'hot', 'rising', 'important'].includes(tagText)) {
                    sentimentTags.push(tagText);
                  }
                });
              }
              
              // Check for color-based sentiment indicators
              const colorElems = item.querySelectorAll('[class*="green"], [class*="red"], [class*="bull"], [class*="bear"]');
              colorElems.forEach(elem => {
                const className = elem.className.toLowerCase();
                if (className.includes('green') || className.includes('bull')) sentimentTags.push('bullish');
                if (className.includes('red') || className.includes('bear')) sentimentTags.push('bearish');
              });
              
              return [...new Set(sentimentTags)]; // Remove duplicates
            };

            // Extract source
            const extractSource = () => {
              const sourceSelectors = [
                '.source', '.author', '.domain', '.publisher',
                '[class*="source"]', '.news-source', 
                '.media-source', '.site-name'
              ];
              for (const selector of sourceSelectors) {
                const sourceElem = item.querySelector(selector);
                if (sourceElem?.textContent?.trim()) {
                  return sourceElem.textContent.trim();
                }
              }
              return null;
            };

            // Extract votes
            const extractVotes = () => {
              const votes = { up: 0, down: 0, total: 0 };
              const voteSelectors = [
                '.votes', '.vote-count', '.points', '.score',
                '[class*="vote"]', '.upvotes', '.karma'
              ];
              
              for (const selector of voteSelectors) {
                const voteElem = item.querySelector(selector);
                if (voteElem) {
                  const voteText = voteElem.textContent?.trim() || '';
                  const numbers = voteText.match(/\d+/);
                  if (numbers) {
                    votes.total = parseInt(numbers[0]);
                  }
                  break;
                }
              }
              return votes;
            };

            const panicScore = extractPanicScore();
            console.log(`Item ${index + 1}: Title="${title}", PanicScore=${panicScore}, URL="${url}"`);

            const newsItem = {
              title,
              url,
              panicScore,
              timestamp: extractTimestamp(),
              sentiment: extractSentiment(),
              source: extractSource(),
              votes: extractVotes(),
              scrapedAt: new Date().toISOString(),
            };

            return newsItem;
          } catch (error) {
            console.error('Error extracting news item:', error);
            return null;
          }
        }).filter(item => item !== null);
      }, maxItems);

      this.logger.log(`Extracted ${newsData.length} news items`);
      
      // Log some sample data for debugging
      if (newsData.length > 0) {
        this.logger.log(`Sample item: ${JSON.stringify(newsData[0], null, 2)}`);
      }
      
      const sanitizedNewsData = newsData.map(item => ({
        ...item,
        panicScore: item.panicScore === null ? undefined : item.panicScore,
        timestamp: item.timestamp === null ? undefined : item.timestamp,
        source: item.source === null ? undefined : item.source,
      }));
      
      return sanitizedNewsData;
    } catch (error: any) {
      this.logger.error(`Error extracting news data: ${error.message}`);
      return [];
    }
  }

  // ... rest of the methods remain the same ...

  async scrapeAndProcessPanicScore(options: ScrapeRequestDto): Promise<ScrapeResponseDto> {
    const startTime = Date.now();
    
    try {
      // Determine which filters to use
      const filtersToProcess = options.filters && options.filters.length > 0 
        ? options.filters 
        : [options.filter || FilterType.ALL];

      this.logger.log(`Processing filters: ${filtersToProcess.join(', ')}`);

      // Scrape all filters
      const allData: NewsItem[] = [];
      const filtersProcessed: string[] = [];

      for (const filter of filtersToProcess) {
        try {
          this.logger.log(`Starting scrape for filter: ${filter}`);
          const filterData = await this.scrapeFilterData(
            filter, 
            options.maxItems || 50, 
            options.enablePanicScore !== false
          );
          
          allData.push(...filterData);
          filtersProcessed.push(filter);
          
          this.logger.log(`Successfully scraped ${filterData.length} items for filter: ${filter}`);
          
          // Log sample of items with panic scores
          const itemsWithScores = filterData.filter(item => item.panicScore !== undefined);
          if (itemsWithScores.length > 0) {
            this.logger.log(`Items with PanicScore for ${filter}: ${itemsWithScores.length}/${filterData.length}`);
            this.logger.log(`Sample scores: ${itemsWithScores.slice(0, 3).map(item => item.panicScore).join(', ')}`);
          }
          
          // Delay between filter requests
          if (filtersToProcess.length > 1) {
            await new Promise(resolve => setTimeout(resolve, options.delay || 3000));
          }
          
        } catch (error: any) {
          this.logger.error(`Failed to scrape filter ${filter}: ${error.message}`);
        }
      }

      this.logger.log(`Total items before filtering: ${allData.length}`);

      // Remove duplicates based on URL
      const uniqueData = allData.filter((item, index, self) => 
        index === self.findIndex(other => other.url === item.url)
      );

      this.logger.log(`Unique items after deduplication: ${uniqueData.length}`);

      // Apply filters
      let filteredData = uniqueData;

      // Filter by minimum panic score if specified
      if (options.minPanicScore !== undefined) {
        const beforeFilter = filteredData.length;
        filteredData = filteredData.filter(item => 
          item.panicScore !== undefined && 
          item.panicScore !== null && 
          item.panicScore >= (options.minPanicScore || 0)
        );
        this.logger.log(`Filtered by minPanicScore ${options.minPanicScore}: ${beforeFilter} -> ${filteredData.length} items`);
      }

      // Sort by panic score if requested
      if (options.sortByPanicScore !== false) {
        filteredData.sort((a, b) => {
          const scoreA = a.panicScore || 0;
          const scoreB = b.panicScore || 0;
          return scoreB - scoreA; // Highest first
        });
      }

      // Calculate comprehensive statistics
      const stats = this.calculateAdvancedStats(uniqueData); // Use all unique data for stats

      // Generate categorized news
      const highValueNews = filteredData.filter(item => (item.panicScore || 0) > 70);
      const trendingNews = filteredData.filter(item => (item.panicScore || 0) > 50);

      // Generate recommendations
      const recommendations = this.generateRecommendations(filteredData);

      const response: ScrapeResponseDto = {
        success: true,
        message: `Successfully scraped ${filteredData.length} unique items with PanicScore data from ${filtersProcessed.length} filters`,
        data: filteredData,
        highValueNews,
        trendingNews,
        stats,
        filtersProcessed,
        timestamp: new Date().toISOString(),
        recommendations,
      };

      this.logger.log(`Scraping completed: ${filteredData.length} items processed in ${Date.now() - startTime}ms`);
      
      return response;

    } catch (error: any) {
      this.logger.error(`Error in scrapeAndProcessPanicScore: ${error.message}`);
      throw error;
    }
  }

  // Add the missing methods from the previous implementation
  private calculateAdvancedStats(data: NewsItem[]): any {
    const stats = {
      totalItems: data.length,
      itemsWithPanicScore: data.filter(item => item.panicScore !== undefined && item.panicScore !== null).length,
      panicScorePercentage: 0,
      uniqueSources: new Set(data.map(item => item.source).filter(Boolean)).size,
      sentimentDistribution: {} as Record<string, number>,
      panicScoreStats: { min: 0, max: 0, avg: 0, median: 0, count: 0, stdDev: 0 },
      itemsPerFilter: {} as Record<string, number>,
      topSources: [] as { source: string; count: number }[],
    };

    // Calculate panic score percentage
    stats.panicScorePercentage = stats.totalItems > 0 
      ? Math.round((stats.itemsWithPanicScore / stats.totalItems) * 100 * 100) / 100 
      : 0;

    // Calculate sentiment distribution
    const allSentiments = data.flatMap(item => item.sentiment || []);
    for (const sentiment of allSentiments) {
      stats.sentimentDistribution[sentiment] = (stats.sentimentDistribution[sentiment] || 0) + 1;
    }

    // Calculate items per filter
    for (const item of data) {
      const filter = item.filterType || 'unknown';
      stats.itemsPerFilter[filter] = (stats.itemsPerFilter[filter] || 0) + 1;
    }

    // Calculate advanced PanicScore statistics
    const panicScores = data
      .map(item => item.panicScore)
      .filter(score => score !== undefined && score !== null) as number[];

    if (panicScores.length > 0) {
      const sorted = panicScores.sort((a, b) => a - b);
      const sum = panicScores.reduce((acc, score) => acc + score, 0);
      const avg = sum / panicScores.length;
      
      // Calculate standard deviation
      const variance = panicScores.reduce((acc, score) => acc + Math.pow(score - avg, 2), 0) / panicScores.length;
      const stdDev = Math.sqrt(variance);

      stats.panicScoreStats = {
        min: Math.min(...panicScores),
        max: Math.max(...panicScores),
        avg: Math.round(avg * 100) / 100,
        median: sorted[Math.floor(sorted.length / 2)],
        count: panicScores.length,
        stdDev: Math.round(stdDev * 100) / 100,
      };
    }

    // Calculate top sources
    const sourceCounts: Record<string, number> = {};
    for (const item of data) {
      if (item.source) {
        sourceCounts[item.source] = (sourceCounts[item.source] || 0) + 1;
      }
    }
    
    stats.topSources = Object.entries(sourceCounts)
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return stats;
  }

  private generateRecommendations(data: NewsItem[]): any {
    // Sort by panic score for analysis
    const sortedByPanicScore = data
      .filter(item => item.panicScore !== undefined && item.panicScore !== null)
      .sort((a, b) => (b.panicScore || 0) - (a.panicScore || 0));

    return {
      topStory: sortedByPanicScore[0] || null,
      emergingTrends: sortedByPanicScore
        .filter(item => (item.panicScore || 0) >= 60 && (item.panicScore || 0) < 80)
        .slice(0, 5),
      watchList: sortedByPanicScore
        .filter(item => (item.panicScore || 0) >= 40 && (item.panicScore || 0) < 60)
        .slice(0, 10),
    };
  }
}