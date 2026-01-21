import { ApiProperty } from '@nestjs/swagger';

export class CreateOrderDto {
	@ApiProperty({ description: 'Trading symbol', example: 'XRPUSDT' })
	symbol: string;

	@ApiProperty({ description: 'Order side', enum: ['BUY', 'SELL'], example: 'BUY' })
	side: 'BUY' | 'SELL';

	@ApiProperty({ description: 'Order type', enum: ['LIMIT', 'MARKET'], example: 'LIMIT' })
	type: 'LIMIT' | 'MARKET';

	@ApiProperty({ description: 'Order quantity', required: false, example: '10' })
	quantity?: string;

	@ApiProperty({ description: 'Quote order quantity (for MARKET orders)', required: false })
	quoteOrderQty?: string;

	@ApiProperty({ description: 'Order price (required for LIMIT orders)', required: false, example: '1.5' })
	price?: string;

	@ApiProperty({ description: 'Client order ID', required: false })
	newClientOrderId?: string;

	@ApiProperty({ 
		description: 'Self-trade prevention mode', 
		enum: ['', 'cancel_maker', 'cancel_taker', 'cancel_both'], 
		required: false 
	})
	stpMode?: '' | 'cancel_maker' | 'cancel_taker' | 'cancel_both';

	@ApiProperty({ description: 'Receive window in milliseconds (default 5000, max 60000)', required: false })
	recvWindow?: number;
}
