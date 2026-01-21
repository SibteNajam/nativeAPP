import { Controller, Get, Query, Logger, Post, Body, Delete, Headers, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse, ApiBody, ApiParam } from '@nestjs/swagger';
import { GateioOrderService } from './gateio_order.service';
import { ListOrdersQueryDto } from './dto/list-orders.dto';
import { BatchOrderItemDto } from './dto/batch-orders.dto';
import { CancelOrdersQueryDto } from './dto/cancel-orders.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { CancelBatchOrderItemDto } from './dto/cancel-batch-orders.dto';
import { PriceOrderDto, PriceOrderResponseDto } from './dto/price-order.dto';
import { CancelPriceOrdersQueryDto } from './dto/cancel-price-orders.dto';

@ApiTags('Gate.io Orders')
@Controller('gateio-order')
export class GateioOrderController {
	private readonly logger = new Logger(GateioOrderController.name);

	constructor(private readonly gateioOrderService: GateioOrderService) {}

	@Get('spot/open_orders')
	@ApiOperation({ summary: 'List all open orders' })
	@ApiQuery({ name: 'page', required: false })
	@ApiQuery({ name: 'limit', required: false })
	@ApiQuery({ name: 'account', required: false })
	@ApiResponse({ status: 200, description: 'List retrieved successfully' })
	async listOpenOrders(
		@Query('page') page?: string,
		@Query('limit') limit?: string,
		@Query('account') account?: string,
	) {
		this.logger.log(`GET /gateio-order/spot/open_orders called${account ? ` account=${account}` : ''}`);

		const opts: any = {};
		if (page) opts.page = parseInt(page, 10);
		if (limit) opts.limit = parseInt(limit, 10);
		if (account) opts.account = account;

		return this.gateioOrderService.getAllOpenOrders(opts);
	}

	@Get('spot/orders')
	@ApiOperation({ summary: 'List orders' })
	@ApiQuery({ name: 'currency_pair', required: false })
	@ApiQuery({ name: 'status', required: true, description: 'open | finished | closed | cancelled' })
	@ApiQuery({ name: 'page', required: false })
	@ApiQuery({ name: 'limit', required: false })
	@ApiQuery({ name: 'account', required: false })
	@ApiQuery({ name: 'from', required: false })
	@ApiQuery({ name: 'to', required: false })
	@ApiQuery({ name: 'side', required: false })
	@ApiResponse({ status: 200, description: 'List retrieved successfully' })
	async listOrders(@Query() query: ListOrdersQueryDto) {
		this.logger.log(`GET /gateio-order/spot/orders called status=${query.status} currency_pair=${query.currency_pair || '-'} page=${query.page || '-'} limit=${query.limit || '-'} account=${query.account || '-'} from=${query.from || '-'} to=${query.to || '-'} side=${query.side || '-'} `);
		// Convert numeric fields if they arrive as strings via query
		const normalized: any = {
			...query,
		};
		if (typeof normalized.page === 'string') normalized.page = parseInt(normalized.page, 10);
		if (typeof normalized.limit === 'string') normalized.limit = parseInt(normalized.limit, 10);
		if (typeof normalized.from === 'string') normalized.from = parseInt(normalized.from, 10);
		if (typeof normalized.to === 'string') normalized.to = parseInt(normalized.to, 10);
		return this.gateioOrderService.listOrders(normalized);
	}

	@Get('spot/order/:order_id')
	@ApiOperation({ summary: 'Query single order details' })
	@ApiParam({ name: 'order_id', required: true, description: 'Order ID or custom text id' })
	@ApiQuery({ name: 'currency_pair', required: true, description: 'Specify trading pair for pending orders' })
	@ApiQuery({ name: 'account', required: false })
	@ApiResponse({ status: 200, description: 'Detail retrieved' })
	async getOrderByID(@Param('order_id') orderId: string, @Query('currency_pair') currency_pair?: string, @Query('account') account?: string) {
		this.logger.log(`GET /gateio-order/spot/orders/${orderId} called currency_pair=${currency_pair || '-'} account=${account || '-'}`);
		const opts: any = {};
		if (currency_pair) opts.currency_pair = currency_pair;
		if (account) opts.account = account;
		return this.gateioOrderService.getOrderByID(orderId, opts);
	}

	@Delete('spot/orders/:order_id')
	@ApiOperation({ summary: 'Cancel single order' })
	@ApiParam({ name: 'order_id', required: true, description: 'The order ID returned when the order was successfully created or the custom ID specified by the user (i.e. the text field)' })
	@ApiQuery({ name: 'currency_pair', required: true, description: 'Trading pair' })
	@ApiQuery({ name: 'account', required: false, description: 'Specify query account' })
	@ApiQuery({ name: 'action_mode', required: false, description: 'Processing Mode: ACK (Asynchronous mode), RESULT (No clearing information), FULL (Full mode - default)' })
	@ApiResponse({ status: 200, description: 'Order cancelled' })
	async cancelOrderByID(
		@Param('order_id') orderId: string,
		@Query('currency_pair') currency_pair: string,
		@Query('account') account?: string,
		@Query('action_mode') action_mode?: string,
		@Headers('x-gate-exptime') xGateExptime?: string,
	) {
		this.logger.log(`DELETE /gateio-order/spot/orders/${orderId} called currency_pair=${currency_pair} account=${account || '-'} action_mode=${action_mode || '-'}`);
		const opts: any = {};
		if (account) opts.account = account;
		if (action_mode) opts.action_mode = action_mode;
		return this.gateioOrderService.cancelOrderByID(orderId, currency_pair, opts, xGateExptime as any);
	}

	@Post('spot/batch_orders')
	@ApiOperation({ summary: 'Batch place orders' })
	@ApiBody({ type: BatchOrderItemDto, isArray: true })
	@ApiResponse({ status: 200, description: 'Batch request execution completed' })
	async batchPlaceOrders(@Body() orders: BatchOrderItemDto[]) {
		this.logger.log(`POST /gateio-order/spot/batch_orders called with ${orders?.length || 0} orders`);
		return this.gateioOrderService.batchCreateOrders(orders);
	}

	@Post('spot/cancel_batch_orders')
	@ApiOperation({ summary: 'Cancel batch orders by specified ID list' })
	@ApiBody({ type: CancelBatchOrderItemDto, isArray: true })
	@ApiResponse({ status: 200, description: 'Batch cancellation completed' })
	async cancelBatchOrders(@Body() items: CancelBatchOrderItemDto[], @Headers('x-gate-exptime') xGateExptime?: string) {
		this.logger.log(`POST /gateio-order/spot/cancel_batch_orders called with ${items?.length || 0} items`);
		return this.gateioOrderService.cancelBatchOrders(items, xGateExptime as any);
	}

	@Post('spot/create-order')
	@ApiOperation({ summary: 'Create an order' })
	@ApiBody({ type: CreateOrderDto })
	@ApiResponse({
		status: 201,
		description: 'Order created successfully. Response format depends on action_mode: ACK returns minimal fields, RESULT returns order details without fill info, FULL returns complete order details',
		schema: {
			oneOf: [
				{
					type: 'object',
					properties: {
						id: { type: 'string', description: 'Order ID' },
						text: { type: 'string', description: 'User defined information' },
						amend_text: { type: 'string', description: 'Custom data for amended orders' }
					},
					description: 'ACK mode response'
				},
				{
					type: 'object',
					properties: {
						id: { type: 'string' },
						text: { type: 'string' },
						create_time: { type: 'string' },
						update_time: { type: 'string' },
						create_time_ms: { type: 'number' },
						update_time_ms: { type: 'number' },
						currency_pair: { type: 'string' },
						status: { type: 'string', enum: ['open', 'closed', 'cancelled'] },
						type: { type: 'string', enum: ['limit', 'market'] },
						account: { type: 'string' },
						side: { type: 'string', enum: ['buy', 'sell'] },
						iceberg: { type: 'string' },
						amount: { type: 'string' },
						price: { type: 'string' },
						time_in_force: { type: 'string' },
						auto_borrow: { type: 'boolean' },
						left: { type: 'string' },
						filled_total: { type: 'string' },
						avg_deal_price: { type: 'string' },
						stp_act: { type: 'string' },
						finish_as: { type: 'string' },
						stp_id: { type: 'number' }
					},
					description: 'RESULT mode response'
				},
				{
					type: 'object',
					properties: {
						id: { type: 'string' },
						text: { type: 'string' },
						amend_text: { type: 'string' },
						create_time: { type: 'string' },
						update_time: { type: 'string' },
						create_time_ms: { type: 'number' },
						update_time_ms: { type: 'number' },
						status: { type: 'string' },
						currency_pair: { type: 'string' },
						type: { type: 'string' },
						account: { type: 'string' },
						side: { type: 'string' },
						amount: { type: 'string' },
						price: { type: 'string' },
						time_in_force: { type: 'string' },
						iceberg: { type: 'string' },
						left: { type: 'string' },
						filled_amount: { type: 'string' },
						fill_price: { type: 'string' },
						filled_total: { type: 'string' },
						avg_deal_price: { type: 'string' },
						fee: { type: 'string' },
						fee_currency: { type: 'string' },
						point_fee: { type: 'string' },
						gt_fee: { type: 'string' },
						gt_maker_fee: { type: 'string' },
						gt_taker_fee: { type: 'string' },
						gt_discount: { type: 'boolean' },
						rebated_fee: { type: 'string' },
						rebated_fee_currency: { type: 'string' },
						finish_as: { type: 'string' }
					},
					description: 'FULL mode response'
				}
			]
		}
	})
	async createOrder(@Body() order: CreateOrderDto) {
		this.logger.log(`POST /gateio-order/spot/orders called for ${order.currency_pair} ${order.side} amount=${order.amount} price=${order.price || 'market'}`);
		return this.gateioOrderService.createOrder(order);
	}

	@Post('spot/price_orders')
	@ApiOperation({ summary: 'Create price-triggered order' })
	@ApiBody({ type: PriceOrderDto })
	@ApiResponse({ status: 201, description: 'Order created successfully', type: PriceOrderResponseDto })
	async createTriggerPriceOrder(@Body() body: PriceOrderDto, @Headers('x-gate-exptime') xGateExptime?: string) {
		this.logger.log(`POST /gateio-order/spot/price_orders called market=${body.market} side=${body.put?.side}`);
		return this.gateioOrderService.createTriggerPriceOrder(body, xGateExptime as any);
	}

	@Get('spot/price_orders')
	@ApiOperation({ summary: 'Query running auto order list' })
	@ApiQuery({ name: 'status', required: true, description: 'open | finished' })
	@ApiQuery({ name: 'market', required: false, description: 'Trading market' })
	@ApiQuery({ name: 'account', required: false, description: 'Trading account type. Unified account must be set to unified' })
	@ApiQuery({ name: 'limit', required: false, description: 'Maximum number of records returned in a single list' })
	@ApiQuery({ name: 'offset', required: false, description: 'List offset, starting from 0' })
	@ApiResponse({ status: 200, description: 'List retrieved successfully' })
	async listPriceOrders(
		@Query('status') status: string,
		@Query('market') market?: string,
		@Query('account') account?: string,
		@Query('limit') limit?: string,
		@Query('offset') offset?: string,
	) {
		this.logger.log(`GET /gateio-order/spot/price_orders called status=${status} market=${market || '-'} account=${account || '-'} limit=${limit || '-'} offset=${offset || '-'}`);

		const opts: any = { status };
		if (market) opts.market = market;
		if (account) opts.account = account;
		if (limit) opts.limit = parseInt(limit, 10);
		if (offset) opts.offset = parseInt(offset, 10);

		return this.gateioOrderService.listPriceOrders(opts);
	}

	@Delete('spot/call-all-orders')
	@ApiOperation({ summary: 'Cancel all open orders in specified currency pair' })
	@ApiQuery({ name: 'currency_pair', required: false })
	@ApiQuery({ name: 'side', required: false })
	@ApiQuery({ name: 'account', required: false })
	@ApiQuery({ name: 'action_mode', required: false })
	@ApiResponse({ status: 200, description: 'Batch cancellation request accepted and processed' })
	async cancelOrders(@Query() query: CancelOrdersQueryDto, @Headers('x-gate-exptime') xGateExptime?: string) {
		this.logger.log(`DELETE /gateio-order/spot/call-all-orders called currency_pair=${query.currency_pair || '-'} side=${query.side || '-'} account=${query.account || '-'} action_mode=${query.action_mode || '-'} x-gate-exptime=${!!xGateExptime}`);
		return this.gateioOrderService.cancelOrders(query, xGateExptime as any);
	}

	@Delete('spot/cancel_all_price_orders')
	@ApiOperation({ summary: 'Cancel all auto orders' })
	@ApiQuery({ name: 'market', required: false })
	@ApiQuery({ name: 'account', required: false })
	@ApiResponse({ status: 200, description: 'Batch cancellation request accepted and processed' })
	async cancelPriceOrders(@Query() query: CancelPriceOrdersQueryDto, @Headers('x-gate-exptime') xGateExptime?: string) {
		this.logger.log(`DELETE /gateio-order/spot/cancel_all_price_orders called market=${query?.market || '-'} account=${query?.account || '-'}`);
		return this.gateioOrderService.cancelPriceOrders(query, xGateExptime as any);
	}

	@Get('spot/price_orders/:order_id')
	@ApiOperation({ summary: 'Query single auto order details' })
	@ApiParam({ name: 'order_id', required: true, description: 'ID returned when order is successfully created' })
	@ApiResponse({ status: 200, description: 'Auto order details' })
	async getPriceOrder(@Param('order_id') orderId: string) {
		this.logger.log(`GET /gateio-order/spot/price_orders/${orderId} called`);
		return this.gateioOrderService.getPriceOrderByID(orderId);
	}

	@Delete('spot/cancel_price_order/:order_id')
	@ApiOperation({ summary: 'Cancel single auto order' })
	@ApiParam({ name: 'order_id', required: true, description: 'ID returned when order is successfully created' })
	@ApiResponse({ status: 200, description: 'Auto order cancelled' })
	async cancelPriceOrderByID(@Param('order_id') orderId: string) {
		this.logger.log(`DELETE /gateio-order/spot/cancel_price_order/${orderId} called`);
		return this.gateioOrderService.cancelPriceOrderByID(orderId);
	}
}
