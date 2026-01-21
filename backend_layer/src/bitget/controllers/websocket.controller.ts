// import { Controller, Post, Body, Sse, MessageEvent } from '@nestjs/common';
// import { Observable } from 'rxjs';
// import { MarketService, TickerMessageEvent } from '../services/wsmarket.service';

// @Controller('market')
// export class MarketController {
//   constructor(private readonly marketService: MarketService) {}

//   /**
//    * Frontend calls this when user selects a new symbol
//    * This will unsubscribe from old symbol and subscribe to new one
//    */
//   @Post('select-symbol')
//   selectSymbol(@Body('symbol') symbol: string) {
//     if (!symbol) {
//       return { error: 'Symbol is required' };
//     }
    
//     this.marketService.selectSymbol(symbol);
//     return { 
//       success: true,
//       message: `Subscribed to ticker for ${symbol.toUpperCase()}USDT`,
//       symbol: `${symbol.toUpperCase()}USDT`
//     };
//   }

//   /**
//    * SSE endpoint - Frontend connects ONCE and keeps the connection open
//    * This stream will automatically receive data for whatever symbol is currently subscribed
//    * When user changes symbol (via POST above), this stream will start receiving new symbol's data
//    */
//   @Sse('ticker-stream')
//   tickerStream(): Observable<TickerMessageEvent> {
//     return this.marketService.getTickerStream();
//   }
// }