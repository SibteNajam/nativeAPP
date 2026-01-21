import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBody } from '@nestjs/swagger';
import { MexcOrderService, OpenOrder } from './mexc-order.service';
import {
  KycStatusDto,
  UidDto,
  NewOrderDto,
  BatchOrdersDto,
  CancelOrderDto,
  CancelAllOrdersDto,
  QueryOrderDto,
  AllOrdersDto,
} from './dto';

@ApiTags('MEXC Orders')
@Controller('mexc/orders')
export class MexcOrderController {
  constructor(private readonly mexcOrderService: MexcOrderService) {}

  @Get('open')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get current open orders',
    description:
      'Get all open orders on a symbol. If no symbol is provided, returns open orders for all symbols. Weight(IP): 3 per request.',
  })
  @ApiQuery({
    name: 'symbol',
    required: false,
    description: 'Trading pair symbol (e.g., BTCUSDT, ETHUSDT)',
    example: 'BTCUSDT',
    type: String,
  })
  @ApiQuery({
    name: 'recvWindow',
    required: false,
    description:
      'The number of milliseconds after timestamp the request is valid for. Default: 60000, Max: 60000',
    example: 60000,
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved open orders',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          symbol: {
            type: 'string',
            example: 'BTCUSDT',
            description: 'Trading pair symbol',
          },
          orderId: {
            type: 'number',
            example: 123456789,
            description: 'Order ID',
          },
          orderListId: {
            type: 'number',
            example: -1,
            description: 'Order list ID',
          },
          clientOrderId: {
            type: 'string',
            example: 'myOrder1',
            description: 'Client order ID',
          },
          price: {
            type: 'string',
            example: '50000.00',
            description: 'Order price',
          },
          origQty: {
            type: 'string',
            example: '1.0',
            description: 'Original order quantity',
          },
          executedQty: {
            type: 'string',
            example: '0.5',
            description: 'Executed order quantity',
          },
          cummulativeQuoteQty: {
            type: 'string',
            example: '25000.00',
            description: 'Cumulative quote quantity',
          },
          status: {
            type: 'string',
            example: 'NEW',
            description: 'Order status (NEW, PARTIALLY_FILLED, FILLED, CANCELED, etc.)',
          },
          timeInForce: {
            type: 'string',
            example: 'GTC',
            description: 'Time in force (GTC, IOC, FOK)',
          },
          type: {
            type: 'string',
            example: 'LIMIT',
            description: 'Order type (LIMIT, MARKET, etc.)',
          },
          side: {
            type: 'string',
            example: 'BUY',
            description: 'Order side (BUY or SELL)',
          },
          stopPrice: {
            type: 'string',
            example: '0.0',
            description: 'Stop price',
          },
          icebergQty: {
            type: 'string',
            example: '0.0',
            description: 'Iceberg quantity',
          },
          time: {
            type: 'number',
            example: 1499827319559,
            description: 'Order creation timestamp',
          },
          updateTime: {
            type: 'number',
            example: 1499827319559,
            description: 'Last update timestamp',
          },
          isWorking: {
            type: 'boolean',
            example: true,
            description: 'Is order in orderbook',
          },
          stpMode: {
            type: 'string',
            example: '',
            description: 'Self-trade prevention mode',
          },
          cancelReason: {
            type: 'string',
            example: '',
            description: 'Cancel reason (stp_cancel if canceled due to STP rules)',
          },
          origQuoteOrderQty: {
            type: 'string',
            example: '0.000000',
            description: 'Original quote order quantity',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid parameters',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - WAF limit violated',
  })
  @ApiResponse({
    status: 429,
    description: 'Too many requests - Rate limit exceeded',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async getOpenOrders(
    @Query('symbol') symbol?: string,
    @Query('recvWindow', new ParseIntPipe({ optional: true }))
    recvWindow?: number,
  ): Promise<OpenOrder[]> {
    return this.mexcOrderService.getOpenOrders(symbol, recvWindow);
  }


  /**
   * GET /mexc/orders/uid
   * Query user UID
   */
  @Get('uid')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Query user UID',
    description: `Get the user's MEXC account UID.
    
    **Permission:** SPOT_ACCOUNT_READ
    **Weight(IP):** 1`,
  })
  @ApiQuery({
    name: 'recvWindow',
    required: false,
    description: 'Request validity window (default: 60000ms, max: 60000ms)',
    example: 60000,
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'UID retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        uid: {
          type: 'string',
          example: '209302839',
          description: 'User account UID',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async getUid(
    @Query('recvWindow', new ParseIntPipe({ optional: true }))
    recvWindow?: number,
  ): Promise<{ uid: string }> {
    return this.mexcOrderService.getUid(recvWindow);
  }

  /**
   * GET /mexc/orders/self-symbols
   * Get user API default symbols
   */
  @Get('self-symbols')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get user API default symbols',
    description: `Get the list of trading symbols configured for this API key.
    
    **Permission:** SPOT_ACCOUNT_R
    **Weight(IP):** 1`,
  })
  @ApiResponse({
    status: 200,
    description: 'Symbols retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'number', example: 200 },
        data: {
          type: 'array',
          items: { type: 'string' },
          example: ['BTCUSDT', 'ETHUSDT', 'BNBUSDT'],
        },
        msg: { type: 'string', nullable: true, example: null },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async getSelfSymbols(): Promise<{
    code: number;
    data: string[];
    msg: string | null;
  }> {
    return this.mexcOrderService.getSelfSymbols();
  }


  /**
   * POST /mexc/orders
   * Create new order
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Create new order',
    description: `Place a new spot trading order.
    
    **Permission:** SPOT_DEAL_WRITE
    **Weight(IP):** 1, **Weight(UID):** 1
    
    **Order Type Requirements:**
    - **LIMIT**: Requires \`quantity\` and \`price\`
    - **MARKET**: Requires \`quantity\` OR \`quoteOrderQty\`
      - When buying: \`quoteOrderQty\` specifies how much quote asset (e.g., USDT) to spend
      - When selling: \`quantity\` specifies how much base asset (e.g., BTC) to sell
    
    **Self-Trade Prevention (stpMode):**
    - \`""\` (empty): No restriction (default)
    - \`"cancel_maker"\`: Cancel maker order
    - \`"cancel_taker"\`: Cancel taker order
    - \`"cancel_both"\`: Cancel both orders
    
    Note: STP only works if at least one strategy group is created.`,
  })
  @ApiBody({ type: NewOrderDto })
  @ApiResponse({
    status: 200,
    description: 'Order created successfully',
    schema: {
      type: 'object',
      properties: {
        symbol: { type: 'string', example: 'BTCUSDT' },
        orderId: { type: 'string', example: '06a480e69e604477bfb48dddd5f0b750' },
        orderListId: { type: 'number', example: -1 },
        price: { type: 'string', example: '50000.00' },
        origQty: { type: 'string', example: '1.0' },
        type: { type: 'string', example: 'LIMIT' },
        side: { type: 'string', example: 'BUY' },
        stpMode: { type: 'string', example: '' },
        transactTime: { type: 'number', example: 1666676533741 },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid order parameters' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async createOrder(@Body() orderDto: NewOrderDto): Promise<any> {
    const params: Record<string, any> = {
      symbol: orderDto.symbol,
      side: orderDto.side,
      type: orderDto.type,
    };

    if (orderDto.quantity) params.quantity = orderDto.quantity;
    if (orderDto.quoteOrderQty) params.quoteOrderQty = orderDto.quoteOrderQty;
    if (orderDto.price) params.price = orderDto.price;
    if (orderDto.newClientOrderId) params.newClientOrderId = orderDto.newClientOrderId;
    if (orderDto.stpMode) params.stpMode = orderDto.stpMode;

    return this.mexcOrderService.createOrder(params);
  }

  /**
   * POST /mexc/orders/batch
   * Create batch orders
   */
  @Post('batch')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Create batch orders',
    description: `Place multiple orders in a single request.
    
    **Permission:** SPOT_DEAL_WRITE
    **Weight(IP):** 1, **Weight(UID):** 1
    **Rate Limit:** 2 times/second
    
    **Limitations:**
    - Maximum 20 orders per request
    - All orders must be for the same symbol
    - Each order follows the same validation rules as single orders
    
    **Response:**
    - Returns array of successful orders and failed orders
    - Failed orders include error code and message
    - Successful orders include orderId and symbol`,
  })
  @ApiBody({ type: BatchOrdersDto })
  @ApiResponse({
    status: 200,
    description: 'Batch orders processed (may contain successes and failures)',
    schema: {
      type: 'array',
      items: {
        oneOf: [
          {
            type: 'object',
            properties: {
              symbol: { type: 'string', example: 'BTCUSDT' },
              orderId: { type: 'string', example: '1196315350023612316' },
              orderListId: { type: 'number', example: -1 },
            },
          },
          {
            type: 'object',
            properties: {
              newClientOrderId: { type: 'string', example: '123456' },
              msg: { type: 'string', example: 'The minimum transaction volume cannot be less than:0.5USDT' },
              code: { type: 'number', example: 30002 },
            },
          },
        ],
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid batch order parameters' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 429, description: 'Too many requests - rate limit exceeded' })
  async createBatchOrders(@Body() batchDto: BatchOrdersDto): Promise<any> {
    return this.mexcOrderService.createBatchOrders(batchDto.batchOrders);
  }

  /**
   * DELETE /mexc/orders
   * Cancel an order
   */
  @Delete()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cancel an active order',
    description: `Cancel a specific order by orderId or origClientOrderId.
    
    **Permission:** SPOT_DEAL_WRITE
    **Weight(IP):** 1
    
    **Important:**
    - Either \`orderId\` or \`origClientOrderId\` must be provided
    - \`newClientOrderId\` is optional and can be used to identify the cancel operation`,
  })
  @ApiQuery({
    name: 'symbol',
    required: true,
    description: 'Trading symbol (e.g., BTCUSDT)',
    example: 'BTCUSDT',
    type: String,
  })
  @ApiQuery({
    name: 'orderId',
    required: false,
    description: 'Order ID to cancel',
    example: '123456789',
    type: String,
  })
  @ApiQuery({
    name: 'origClientOrderId',
    required: false,
    description: 'Original client order ID to cancel',
    example: 'myOrder1',
    type: String,
  })
  @ApiQuery({
    name: 'newClientOrderId',
    required: false,
    description: 'New client order ID for this cancel operation',
    example: 'cancelMyOrder1',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Order cancelled successfully',
    schema: {
      type: 'object',
      properties: {
        symbol: { type: 'string', example: 'BTCUSDT' },
        origClientOrderId: { type: 'string', example: 'myOrder1' },
        orderId: { type: 'string', example: '4' },
        clientOrderId: { type: 'string', example: 'cancelMyOrder1' },
        price: { type: 'string', example: '50000.00' },
        origQty: { type: 'string', example: '1.0' },
        executedQty: { type: 'string', example: '0.0' },
        cummulativeQuoteQty: { type: 'string', example: '0.0' },
        status: { type: 'string', example: 'CANCELED' },
        timeInForce: { type: 'string', example: 'GTC' },
        type: { type: 'string', example: 'LIMIT' },
        side: { type: 'string', example: 'BUY' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request - missing orderId or origClientOrderId' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async cancelOrder(
    @Query('symbol') symbol: string,
    @Query('orderId') orderId?: string,
    @Query('origClientOrderId') origClientOrderId?: string,
    @Query('newClientOrderId') newClientOrderId?: string,
  ): Promise<any> {
    return this.mexcOrderService.cancelOrder({
      symbol,
      orderId,
      origClientOrderId,
      newClientOrderId,
    });
  }

  /**
   * DELETE /mexc/orders/all
   * Cancel all open orders on a symbol
   */
  @Delete('all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cancel all open orders on a symbol',
    description: `Cancel all pending orders for specified symbol(s), including OCO pending orders.
    
    **Permission:** SPOT_DEAL_WRITE
    **Weight(IP):** 1
    
    **Limitations:**
    - Maximum 5 symbols can be provided
    - Symbols should be separated by comma (e.g., "BTCUSDT,ETHUSDT")`,
  })
  @ApiQuery({
    name: 'symbol',
    required: true,
    description: 'Trading symbol(s) - Maximum 5, separated by comma',
    example: 'BTCUSDT',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'All orders cancelled successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          symbol: { type: 'string', example: 'BTCUSDT' },
          origClientOrderId: { type: 'string', example: 'E6APeyTJvkMvLMYMqu1KQ4' },
          orderId: { type: 'string', example: '11' },
          orderListId: { type: 'number', example: -1 },
          clientOrderId: { type: 'string', example: 'pXLV6Hz6mprAcVYpVMTGgx' },
          price: { type: 'string', example: '50000.00' },
          origQty: { type: 'string', example: '1.0' },
          executedQty: { type: 'string', example: '0.0' },
          cummulativeQuoteQty: { type: 'string', example: '0.0' },
          status: { type: 'string', example: 'CANCELED' },
          timeInForce: { type: 'string', example: 'GTC' },
          type: { type: 'string', example: 'LIMIT' },
          side: { type: 'string', example: 'BUY' },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async cancelAllOrders(@Query('symbol') symbol: string): Promise<any> {
    return this.mexcOrderService.cancelAllOrders(symbol);
  }

  /**
   * GET /mexc/orders/query
   * Query order status
   */
  @Get('query')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Query order status',
    description: `Check the status of a specific order.
    
    **Permission:** SPOT_DEAL_READ
    **Weight(IP):** 2
    
    **Important:**
    - Either \`orderId\` or \`origClientOrderId\` must be provided`,
  })
  @ApiQuery({
    name: 'symbol',
    required: true,
    description: 'Trading symbol (e.g., BTCUSDT)',
    example: 'BTCUSDT',
    type: String,
  })
  @ApiQuery({
    name: 'orderId',
    required: false,
    description: 'Order ID to query',
    example: '123456789',
    type: String,
  })
  @ApiQuery({
    name: 'origClientOrderId',
    required: false,
    description: 'Original client order ID to query',
    example: 'myOrder1',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Order details retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        symbol: { type: 'string', example: 'BTCUSDT' },
        orderId: { type: 'string', example: '1' },
        orderListId: { type: 'number', example: -1 },
        clientOrderId: { type: 'string', example: 'myOrder1' },
        price: { type: 'string', example: '50000.00' },
        Qty: { type: 'string', example: '1.0' },
        executedQty: { type: 'string', example: '0.5' },
        cummulativeQuoteQty: { type: 'string', example: '25000.00' },
        status: { type: 'string', example: 'PARTIALLY_FILLED' },
        timeInForce: { type: 'string', example: 'GTC' },
        type: { type: 'string', example: 'LIMIT' },
        side: { type: 'string', example: 'BUY' },
        stopPrice: { type: 'string', example: '0.0' },
        time: { type: 'number', example: 1499827319559 },
        updateTime: { type: 'number', example: 1499827319559 },
        stpMode: { type: 'string', example: '' },
        cancelReason: { type: 'string', example: '' },
        isWorking: { type: 'boolean', example: true },
        origQuoteOrderQty: { type: 'string', example: '0.000000' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request - missing orderId or origClientOrderId' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async queryOrder(
    @Query('symbol') symbol: string,
    @Query('orderId') orderId?: string,
    @Query('origClientOrderId') origClientOrderId?: string,
  ): Promise<any> {
    return this.mexcOrderService.queryOrder({
      symbol,
      orderId,
      origClientOrderId,
    });
  }

  /**
   * GET /mexc/orders/all
   * Get all account orders
   */
  @Get('all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get all account orders',
    description: `Get all account orders including active, cancelled, or completed orders.
    
    **Permission:** SPOT_DEAL_READ
    **Weight(IP):** 10
    
    **Important:**
    - Query period is the latest 24 hours by default
    - Can query a maximum of the latest 7 days
    - Default limit: 500, Max: 1000`,
  })
  @ApiQuery({
    name: 'symbol',
    required: true,
    description: 'Trading symbol (e.g., BTCUSDT)',
    example: 'BTCUSDT',
    type: String,
  })
  @ApiQuery({
    name: 'startTime',
    required: false,
    description: 'Start time in milliseconds',
    example: 1499827319559,
    type: Number,
  })
  @ApiQuery({
    name: 'endTime',
    required: false,
    description: 'End time in milliseconds',
    example: 1499827319559,
    type: Number,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of records (default: 500, max: 1000)',
    example: 500,
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'All orders retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          symbol: { type: 'string', example: 'BTCUSDT' },
          orderId: { type: 'string', example: '1' },
          orderListId: { type: 'number', example: -1 },
          clientOrderId: { type: 'string', example: 'myOrder1' },
          price: { type: 'string', example: '50000.00' },
          origQty: { type: 'string', example: '1.0' },
          executedQty: { type: 'string', example: '1.0' },
          cummulativeQuoteQty: { type: 'string', example: '50000.00' },
          status: { type: 'string', example: 'FILLED' },
          timeInForce: { type: 'string', example: 'GTC' },
          type: { type: 'string', example: 'LIMIT' },
          side: { type: 'string', example: 'BUY' },
          stopPrice: { type: 'string', example: '0.0' },
          icebergQty: { type: 'string', example: '0.0' },
          time: { type: 'number', example: 1499827319559 },
          updateTime: { type: 'number', example: 1499827319559 },
          isWorking: { type: 'boolean', example: false },
          stpMode: { type: 'string', example: '' },
          cancelReason: { type: 'string', example: '' },
          origQuoteOrderQty: { type: 'string', example: '0.000000' },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async getAllOrders(
    @Query('symbol') symbol: string,
    @Query('startTime', new ParseIntPipe({ optional: true })) startTime?: number,
    @Query('endTime', new ParseIntPipe({ optional: true })) endTime?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ): Promise<any> {
    // If controller caller did not provide startTime/endTime, set defaults here as well
    const now = Date.now();
    const sixDaysMs = 6 * 24 * 60 * 60 * 1000;
    const resolvedStart = startTime !== undefined && startTime !== null ? startTime : now - sixDaysMs;
    const resolvedEnd = endTime !== undefined && endTime !== null ? endTime : now;

    return this.mexcOrderService.getAllOrders({
      symbol,
      startTime: resolvedStart,
      endTime: resolvedEnd,
      limit,
    });
  }
}