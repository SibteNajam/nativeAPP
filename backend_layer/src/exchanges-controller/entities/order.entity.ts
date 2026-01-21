import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('orders')
@Index(['orderId', 'exchange'], { unique: true })
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  // Order identification
  @Column({ name: 'order_id', type: 'bigint' })
  @Index()
  orderId: number | bigint;

  @Column({ name: 'client_order_id', type: 'varchar', length: 50, nullable: true })
  clientOrderId: string;

  @Column({ type: 'varchar', length: 20 })
  @Index()
  exchange: string;

  @Column({ type: 'varchar', length: 20 })
  @Index()
  symbol: string;

  // Order details
  @Column({ type: 'varchar', length: 10 })
  side: string; // BUY or SELL

  @Column({ type: 'varchar', length: 20 })
  type: string; // LIMIT, MARKET, STOP_LOSS_LIMIT, etc.

  @Column({ type: 'decimal', precision: 20, scale: 8 })
  quantity: string;

  @Column({ type: 'decimal', precision: 20, scale: 8, nullable: true })
  price: string;

  @Column({ name: 'executed_qty', type: 'decimal', precision: 20, scale: 8, default: 0 })
  executedQty: string;

  @Column({ type: 'varchar', length: 20 })
  @Index()
  status: string; // NEW, FILLED, PARTIALLY_FILLED, CANCELED, etc.

  // Linking orders
  @Column({ name: 'parent_order_id', type: 'bigint', nullable: true })
  @Index()
  parentOrderId: number | bigint | null;

  @Column({ name: 'order_group_id', type: 'varchar', length: 50, nullable: true })
  @Index()
  orderGroupId: string | null;

  @Column({ name: 'order_role', type: 'varchar', length: 20, nullable: true })
  orderRole: string | null; // 'ENTRY', 'TP1', 'TP2', 'SL', 'MANUAL_SELL', 'MANUAL_BUY'

  // TP/SL configuration (stored on entry order)
  @Column({ name: 'tp_levels', type: 'jsonb', nullable: true })
  tpLevels: number[] | null;

  @Column({ name: 'sl_price', type: 'decimal', precision: 20, scale: 8, nullable: true })
  slPrice: string | null;

  // Timestamps (all in UTC)
  @Column({ name: 'order_timestamp', type: 'timestamp with time zone' })
  @Index()
  orderTimestamp: Date;

  @Column({ name: 'filled_timestamp', type: 'timestamp with time zone', nullable: true })
  filledTimestamp: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;

  // Additional metadata
  @Column({ type: 'text', nullable: true })
  note: string | null;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  @Index()
  userId: string | null;

  // JSON metadata for storing additional order information
  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    tp1?: number;
    tp2?: number;
    sl?: number;
    finalSignalId?: string;
    portfolioId?: string;
    tpGroup?: string; // 'TP1' or 'TP2' for Bitget order groups
  } | null;
}
