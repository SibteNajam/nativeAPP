// entities/long-short-overall.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Symbol } from './gateio.entity';

import { Timeframe } from './gateio.entity';
@Entity('long_short_overall')
export class LongShortOverall {
   @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Symbol)
  @JoinColumn({ name: 'symbol_id' })
  symbol: Symbol;

  @ManyToOne(() => Timeframe)
  @JoinColumn({ name: 'timeframe_id' })
  timeframe: Timeframe;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  long_percent: number;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  short_percent: number;

  @Column({ type: 'timestamptz' })
  last_updated: Date;
}

// entities/long-short-exchanges.entity.ts

@Entity('long_short_exchanges')
export class LongShortExchanges {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Symbol)
  @JoinColumn({ name: 'symbol_id' })
  symbol: Symbol;

  @ManyToOne(() => Timeframe)
  @JoinColumn({ name: 'timeframe_id' })
  timeframe: Timeframe;

  @Column({ length: 50 })
  exchange: string;

  @Column({ length: 20 })
  bias: string;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  long_percent: number;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  short_percent: number;

  @Column({ type: 'timestamptz' })
  last_updated: Date;
}