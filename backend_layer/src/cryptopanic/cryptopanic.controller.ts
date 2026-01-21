import {
  Controller,
  Post,
  Body,
  HttpException,
  HttpStatus,
  Logger,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { CryptoPanicService } from './cryptopanic.service';
import { ScrapeRequestDto } from './dto/scrape-request.dto';
import { ScrapeResponseDto } from './dto/scrape-response.dto';

@ApiTags('CryptoPanic Scraper')
@Controller('cryptopanic')
@UsePipes(new ValidationPipe({ transform: true }))
export class CryptoPanicController {
  private readonly logger = new Logger(CryptoPanicController.name);

  constructor(private readonly cryptoPanicService: CryptoPanicService) {}

  @Post('scrape-panic-score')
  @ApiOperation({ 
    summary: 'Scrape CryptoPanic news with PanicScore data',
    description: 'Single endpoint to scrape news data with PanicScore values. Handles all filtering, processing, and calculations internally.'
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully scraped news data with PanicScore',
    type: ScrapeResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request parameters',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error during scraping',
  })
  async scrapePanicScore(
    @Body() scrapeRequest: ScrapeRequestDto,
  ): Promise<ScrapeResponseDto> {
    const startTime = Date.now();
    
    try {
      this.logger.log(`Starting PanicScore scraping with params: ${JSON.stringify(scrapeRequest)}`);
      
      // Let the service handle all the logic internally
      const result = await this.cryptoPanicService.scrapeAndProcessPanicScore(scrapeRequest);
      
      const processingTimeMs = Date.now() - startTime;
      
      return {
        ...result,
        processingTimeMs,
        timestamp: new Date().toISOString(),
      };
      
    } catch (error) {
      this.logger.error(`Error scraping PanicScore: ${error.message}`);
      throw new HttpException(
        `Failed to scrape PanicScore data: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}