import { Controller, Post, Body, Logger, Query, Get, Req, Delete } from '@nestjs/common';
import type { Request } from 'express';
import { ApiTags, ApiOperation, ApiBody, ApiQuery } from '@nestjs/swagger';
import { OrderService } from '../services/orders.service';
import { PlaceSpotOrderDto } from '../dto/spotorder.dto';
import { OrderInfo } from '../dto/order-info.dto';
import { PlacedOrderDto } from '../dto/placed-order.dto';
import { ProcessedOrderDto } from '../dto/processed-order.dto';
import { BatchBitgetOrdersDto, BatchOrdersResponseDto, BatchCancelOrdersDto } from '../dto/batch-orders.dto';
import { Public } from 'src/decorators/isPublic';

@ApiTags('Bitget Orders')
@Controller('bitget/order')
export class OrderController {
  private readonly logger = new Logger(OrderController.name);

  constructor(private readonly orderService: OrderService) { }

  @Public()
  @ApiOperation({ summary: 'Place spot order' })
  @ApiBody({ type: PlaceSpotOrderDto })
  @Post('spot')
  async placeSpotOrder(@Body() body: PlaceSpotOrderDto) {
    console.log('Received spot order request:', body);
    const result = this.orderService.placeSpotOrder(body);
    console.log('Result of placeSpotOrder:', result);
    return result;
  }

  @ApiOperation({ summary: 'Get spot order info' })
  @ApiBody({ type: OrderInfo })
  @Post('spot/order-info')
  async getSpotOrderInfo(@Body() body: OrderInfo) {
    return this.orderService.getSpotOrderInfo(body);
  }

  @ApiOperation({ summary: 'Cancel spot order' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        symbol: { type: 'string', description: 'Trading pair symbol, e.g., BTCUSDT' },
        orderId: { type: 'string', description: 'Order ID to cancel' },
      },
      required: ['symbol', 'orderId'],
    },
  })
  @Post('cancel-spot-order')
  async cancelSpotOrder(@Body() body: { symbol: string; orderId: string }) {
    return this.orderService.cancelOrder(body.symbol, body.orderId);
  }

  @Get('unfilled-spot-orders')
  @ApiOperation({ summary: 'Get unfilled (open) spot orders' })
  @ApiQuery({
    name: 'symbol',
    required: false,
    description: 'Trading pair (optional), e.g., BTCUSDT',
  })
  @ApiQuery({
    name: 'tpslType',
    required: false,
    description: 'Order type (optional), e.g., spot, margin',
  })
  async getUnfilledSpotOrders(
    @Query('symbol') symbol?: string,
    @Query('tpslType') tpslType?: string
  ) {
    const validTpslType = tpslType === 'normal' || tpslType === 'tpsl' ? tpslType as 'normal' | 'tpsl' : undefined;
    const [unfilledOrders, planOrders] = await Promise.all([
      this.orderService.getUnfilledOrders(symbol, validTpslType),
      this.orderService.getPlanOrders(symbol),
    ]);

    return {
      unfilledOrders,
      planOrders,
    };
  }

  @Get('all-open-orders')
  @ApiOperation({ summary: 'Get all open orders (unfilled + plan orders combined)' })
  @ApiQuery({
    name: 'symbol',
    required: false,
    description: 'Trading pair (optional), e.g., BTCUSDT',
  })
  async getAllOpenOrders(@Req() req: Request, @Query('symbol') symbol?: string) {
    // Log request origin and headers to help identify who/what is calling this endpoint
    const remote = req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
    this.logger.log(`GET /bitget/order/all-open-orders called from ${remote}`);
    try {
      this.logger.debug(`Request headers: ${JSON.stringify(req.headers)}`);
    } catch (err) {
      // If headers cannot be stringified for any reason, still continue
      this.logger.debug('Request headers logging failed', err?.message || err);
    }

    return this.orderService.getAllOpenOrders(symbol);
  }
  @Public()
  @Get('trade-fills')
  @ApiOperation({ summary: 'Get trade fills (filled orders) history' })
  @ApiQuery({
    name: 'symbol',
    required: false,
    description: 'Trading pair (optional), e.g., BTCUSDT',
  })
  @ApiQuery({
    name: 'orderId',
    required: false,
    description: 'Order ID (optional)',
  })
  @ApiQuery({
    name: 'startTime',
    required: false,
    description: 'Start time in Unix milliseconds (optional)',
  })
  @ApiQuery({
    name: 'endTime',
    required: false,
    description: 'End time in Unix milliseconds (optional)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of results (default: 100, max: 100)',
  })
  @ApiQuery({
    name: 'idLessThan',
    required: false,
    description: 'Requests content before this tradeId (for pagination)',
  })
  async getTradeFills(
    @Query('symbol') symbol?: string,
    @Query('orderId') orderId?: string,
    @Query('startTime') startTime?: string,
    @Query('endTime') endTime?: string,
    @Query('limit') limit?: string,
    @Query('idLessThan') idLessThan?: string
  ) {
    return this.orderService.getTradeFills({
      symbol,
      orderId,
      startTime,
      endTime,
      limit,
      idLessThan,
    });
  }

  @Get('plan-orders')
  @ApiQuery({
    name: 'symbol',
    required: false,
    description: 'Trading pair (optional), e.g., BTCUSDT',
  })
  @ApiOperation({ summary: 'Get plan orders' })
  async getPlanOrders(@Query('symbol') symbol?: string) {
    return this.orderService.getPlanOrders(symbol);
  }

  @ApiOperation({ summary: 'Save placed orders' })
  @ApiBody({ type: [PlacedOrderDto] })
  @Post('save-placed-orders')
  async savePlacedOrders(@Body() orders: PlacedOrderDto[]) {
    console.log("inside controller :", orders);
    return this.orderService.savePlacedOrders(orders);
  }

  @ApiOperation({ summary: 'Save processed orders' })
  @ApiBody({ type: [ProcessedOrderDto] })
  @Post('save-processed-orders')
  async saveProcessedOrders(@Body() orders: ProcessedOrderDto[]) {
    console.log('received processed orders:', orders.length);
    return this.orderService.saveProcessedOrders(orders);
  }

  @Get('plan-sub-order')
  @ApiOperation({ summary: 'Get plan sub orders' })
  @ApiQuery({
    name: 'planOrderId',
    required: true,
    description: 'Plan Order ID',
  })
  async getPlanSubOrder(@Query('planOrderId') planOrderId: string) {
    return this.orderService.getPlanSubOrder(planOrderId);
  }

  @Post('batch-orders')
  @ApiOperation({ summary: 'Place batch orders' })
  @ApiBody({ type: BatchBitgetOrdersDto })
  async placeBatchOrders(@Body() batchOrders: BatchBitgetOrdersDto) {
    console.log('Received batch orders request:', batchOrders);
    return this.orderService.placeBatchOrders(batchOrders);
  }

  @Post('batch-cancel-orders')
  @ApiOperation({ summary: 'Cancel batch orders' })
  @ApiBody({ type: BatchCancelOrdersDto })
  async cancelBatchOrders(@Body() batchCancelOrders: BatchCancelOrdersDto) {
    console.log('Received batch cancel orders request:', batchCancelOrders);
    return this.orderService.cancelBatchOrders(batchCancelOrders);
  }

  @Delete('cancel-all-orders-by-symbol')
  @ApiOperation({
    summary: 'Cancel all open orders by symbol',
    description: 'Cancels all active orders on a symbol asynchronously. Frequency limit: 5 times/1s'
  })
  @ApiQuery({
    name: 'symbol',
    required: true,
    description: 'Trading pair (e.g., BTCUSDT)',
  })
  async cancelAllOrdersBySymbol(@Query('symbol') symbol: string) {
    return this.orderService.cancelAllOrdersBySymbol(symbol);
  }
}
