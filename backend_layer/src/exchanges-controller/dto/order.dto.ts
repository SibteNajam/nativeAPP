export class CreateOrderDto {
  orderId: number;
  clientOrderId?: string;
  exchange: string;
  symbol: string;
  side: string;
  type: string;
  quantity: string;
  price?: string;
  executedQty?: string;
  status: string;
  orderTimestamp: number; // Unix timestamp in milliseconds
  tpLevels?: number[];
  slPrice?: number;
  note?: string;
  userId?: number;
}

export class UpdateOrderStatusDto {
  orderId: number;
  exchange: string;
  status: string;
  executedQty?: string;
  filledTimestamp?: number; // Unix timestamp in milliseconds
}

export class LinkTpSlOrdersDto {
  entryOrderId: number;
  exchange: string;
  tpOrders: Array<{
    orderId: number;
    clientOrderId: string;
    price: string;
    quantity: string;
    role: 'TP1' | 'TP2';
  }>;
  slOrder: {
    orderId: number;
    clientOrderId: string;
    price: string;
    quantity: string;
  };
}
