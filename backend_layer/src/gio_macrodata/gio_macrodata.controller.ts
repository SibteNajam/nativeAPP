import { Controller, Post, Body, HttpStatus, HttpException } from '@nestjs/common';
import { GIOMacroDataService } from './gio_macrodata.service';
import {  FundFlowDto, OpenInterestDto,LongShortRatioDto } from './dto/gateio.dto';

@Controller('gate-io')
export class GateIoMacroDataController {
  constructor(private readonly gateIoService: GIOMacroDataService) {}

  /**
   * POST /gate-io/open-interest
   * Submit open interest data from Streamlit scraper
   */
  @Post('open-interest')
  async submitOpenInterest(@Body() openInterestDto: OpenInterestDto) {
    console.log('data received in controller',openInterestDto);
    try {
      const result = await this.gateIoService.saveOpenInterest(openInterestDto);
      return {
        statusCode: HttpStatus.OK,
        message: `Successfully saved ${result.insertedCount} records`,
        insertedCount: result.insertedCount,
      };
    } catch (error) {
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Failed to store open interest data',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
   @Post('fund-flow')
  async submitFundFlow(@Body() fundFlowDto: FundFlowDto) {
    console.log('data received in controller',fundFlowDto);
    try {
      const result = await this.gateIoService.saveFundFlow(fundFlowDto);
      return {
        statusCode: HttpStatus.OK,
        message: `Successfully saved fund flow data`,
        analysisInserted: result.analysisInserted,
        historicalInserted: result.historicalInserted,
      };
    } catch (error) {
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Failed to store fund flow data',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }



  @Post('long-short-ratio')
  async submitLongShortRatio(@Body() dto: LongShortRatioDto) {
    try {
      console.log('Long/Short ratio data received in controller', dto);
      const result = await this.gateIoService.saveLongShortRatio(dto);
      return {
        statusCode: HttpStatus.OK,
        message: `Successfully saved long/short ratio data: ${result.overallInserted} overall, ${result.exchangesInserted} exchange records`,
        overallInserted: result.overallInserted,
        exchangesInserted: result.exchangesInserted,
      };
    } catch (error) {
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Failed to store long/short ratio data',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  

  /**
   * GET /gate-io/open-interest
   * Get all open interest data with optional filters
   * Query params: symbol (optional), timeframe (optional)
   */
//   @Get('open-interest')
//   async getOpenInterest(
//     @Query('symbol') symbol?: string,
//     @Query('timeframe') timeframe?: string,
//   ) {
//     try {
//       const data = await this.gateIoService.getOpenInterestData(symbol, timeframe);
//       return {
//         statusCode: HttpStatus.OK,
//         count: data.length,
//         data,
//       };
//     } catch (error) {
//       throw new HttpException(
//         {
//           statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
//           message: 'Failed to fetch open interest data',
//           error: error.message,
//         },
//         HttpStatus.INTERNAL_SERVER_ERROR,
//       );
//     }
//   }

  /**
   * GET /gate-io/open-interest/latest/:symbol/:timeframe
   * Get latest open interest data for specific symbol and timeframe
   */
//   @Get('open-interest/latest/:symbol/:timeframe')
//   async getLatestOpenInterest(
//     @Param('symbol') symbol: string,
//     @Param('timeframe') timeframe: string,
//   ) {
//     try {
//       const data = await this.gateIoService.getLatestOpenInterest(symbol, timeframe);
//       return {
//         statusCode: HttpStatus.OK,
//         symbol: symbol.toUpperCase(),
//         timeframe,
//         count: data.length,
//         data,
//       };
//     } catch (error) {
//       throw new HttpException(
//         {
//           statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
//           message: `Failed to fetch latest open interest for ${symbol}`,
//           error: error.message,
//         },
//         HttpStatus.INTERNAL_SERVER_ERROR,
//       );
//     }
//   }

  /**
   * GET /gate-io/symbols
   * Get all available symbols in database
   */
//   @Get('symbols')
//   async getAllSymbols() {
//     try {
//       const symbols = await this.gateIoService.getAllSymbols();
//       return {
//         statusCode: HttpStatus.OK,
//         count: symbols.length,
//         symbols,
//       };
//     } catch (error) {
//       throw new HttpException(
//         {
//           statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
//           message: 'Failed to fetch symbols',
//           error: error.message,
//         },
//         HttpStatus.INTERNAL_SERVER_ERROR,
//       );
//     }
//   }

  /**
   * GET /gate-io/timeframes
   * Get all available timeframes in database
   */
//   @Get('timeframes')
//   async getAllTimeframes() {
//     try {
//       const timeframes = await this.gateIoService.getAllTimeframes();
//       return {
//         statusCode: HttpStatus.OK,
//         count: timeframes.length,
//         timeframes,
//       };
//     } catch (error) {
//       throw new HttpException(
//         {
//           statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
//           message: 'Failed to fetch timeframes',
//           error: error.message,
//         },
//         HttpStatus.INTERNAL_SERVER_ERROR,
//       );
//     }
//   }
}