// import { Injectable } from '@nestjs/common';
// import { Observable } from 'rxjs';
// import { map, filter } from 'rxjs/operators';
// import { MarketWebsocketService, TickerData } fro../websocket/bitget.gatewayice';

// export interface TickerMessageEvent {
//   data: TickerData;
// }

// @Injectable()
// export class MarketService {
//   constructor(private readonly wsService: MarketWebsocketService) {}

//   selectSymbol(symbol: string) {
//     const instId = `${symbol.toUpperCase()}USDT`;
    
//     // Fixed: Access getter as property, not method
//     if (this.wsService.currentSymbol !== instId) {
//       // Unsubscribe from previous symbol if exists
//       if (this.wsService.currentSymbol) {
//         this.wsService.unsubscribeTicker(this.wsService.currentSymbol);
//       }
//       // Subscribe to new symbol
//       this.wsService.subscribeTicker(instId);
//     }
//   }

//   // Get stream for all tickers (if needed)
//   getTickerStream(): Observable<TickerMessageEvent> {
//     return this.wsService.tickerSubject.asObservable().pipe(
//       map(data => ({ data } as TickerMessageEvent))
//     );
//   }

//   // Get stream filtered by specific symbol
//   getTickerStreamForSymbol(symbol: string): Observable<TickerMessageEvent> {
//     const instId = `${symbol.toUpperCase()}USDT`;
//     return this.wsService.tickerSubject.asObservable().pipe(
//       filter(data => data.instId === instId),
//       map(data => ({ data } as TickerMessageEvent))
//     );
//   }
// }