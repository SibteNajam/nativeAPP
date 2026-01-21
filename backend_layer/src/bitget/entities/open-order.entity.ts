import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('open_orders')
export class OpenOrder {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 20 })
  symbol: string;

  @Column({ type: 'numeric', precision: 10, scale: 4 })
  entry_price: number;

  @Column({ type: 'varchar', length: 10 })
  order_type: 'market' | 'limit';

  @Column({ type: 'varchar', length: 20 })
  size: string;

  @Column({ type: 'numeric', precision: 15, scale: 6 })
  quantity: number;

  @Column({ type: 'varchar', length: 20, nullable: true })
  stop_loss?: string;

  @Column({ type: 'numeric', precision: 10, scale: 4 })
  take_profit: number;

  @Column({ type: 'varchar', length: 4 })
  side: 'buy' | 'sell';

  @Column({ type: 'varchar', length: 3 })
  force: 'gtc' | 'post_only' | 'fok' | 'ioc';

  @Column({ type: 'varchar', length: 50 })
  order_id: string;

  @Column({ type: 'varchar', length: 100 })
  client_oid: string;

  @Column({ type: 'timestamptz' })
  trade_placement_time: Date;

  @Column({ type: 'int' })
  tp_level: number;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}