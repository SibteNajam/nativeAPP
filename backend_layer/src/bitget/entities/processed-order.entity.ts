import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

export interface TakeProfitLevel {
  level: number;
  price: number;
  percentage: number;
}

@Entity('processed_orders')
export class ProcessedOrder {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 20 })
  symbol: string;

  @Column({ type: 'varchar', length: 10 })
  side: string;

  @Column({ type: 'numeric', precision: 10, scale: 4 })
  entry_price: number;

  @Column({ type: 'numeric', precision: 10, scale: 4, nullable: true })
  stop_loss?: number;

 @Column({ type: 'jsonb', nullable: true })
  take_profit_levels: TakeProfitLevel[];

  @Column({ type: 'numeric', precision: 15, scale: 6 })
  quantity: number;

  @Column({ type: 'numeric', precision: 15, scale: 6 })
  notional: number;

  @Column({ type: 'varchar', length: 10 })
  leverage: string;

  @Column({ type: 'varchar', length: 10 })
  confidence: string;

  @Column({ type: 'varchar', length: 10 })
  timeframe: string;

  @Column({ type: 'varchar', length: 20 })
  analysis_type: string;

  @Column({ type: 'varchar', length: 20 })
  market_condition: string;

  @Column({ type: 'varchar', length: 20 })
  risk_level: string;

  @Column({ type: 'varchar', length: 10 })
  order_type: string;

  @Column({ type: 'varchar', length: 10 })
  force: string;

  @Column({ type: 'varchar', length: 20 })
  margin_mode: string;

  @Column({ type: 'timestamptz', nullable: true })
  timestamp?: Date;

  @Column({ type: 'numeric', precision: 5, scale: 2 })
  amount_percentage: number;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}