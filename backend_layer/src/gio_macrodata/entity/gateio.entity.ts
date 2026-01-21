import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToOne, JoinColumn, CreateDateColumn, Index } from 'typeorm';

@Entity('symbols')
export class Symbol {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'symbol_name', type: 'varchar', length: 20, unique: true })
    symbol_name: string; // Changed to match database column name

   @OneToMany(() => GioOpenInterest, (openInterest) => openInterest.symbol)
    openInterests: GioOpenInterest[];
}


@Entity('timeframes')
export class Timeframe {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 10, unique: true })
  timeframe: string;
}

@Entity('gio_open_interest')
export class GioOpenInterest {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Symbol, (symbol) => symbol.openInterests)
    @JoinColumn({ name: 'symbol_id' })
    symbol: Symbol;

    @Column({ name: 'exchange', type: 'varchar', length: 50 })
    exchange: string;

    @Column({ name: 'open_interest', type: 'varchar', length: 50 })
    open_interest: number;

    @Column({ name: 'change_24h', type: 'varchar', length: 50, nullable: true })
    change_24h: number;

    @Column({ name: 'last_updated', type: 'timestamptz' })
    last_updated: Date;
}



@Entity('market_types')
export class MarketType {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 20, unique: true })
  name: string;
}


@Entity('fund_flow_analysis')
// @Index('idx_fund_flow_analysis_lookup', ['symbol', 'marketType', 'timeframe', 'orderSize', 'createdAt'])
export class FundFlowAnalysis {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Symbol)
  @JoinColumn({ name: 'symbol_id' })
  symbol: Symbol;

  @ManyToOne(() => MarketType)
  @JoinColumn({ name: 'market_type_id' })
  marketType: MarketType;

  @ManyToOne(() => Timeframe)
  @JoinColumn({ name: 'timeframe_id' })
  timeframe: Timeframe;

  @Column({ length: 20 })
  order_size: string;

  @Column({ length: 50, nullable: true })
  net_inflow: string;

  @Column({ length: 50, nullable: true })
  inflow: string;

  @Column({ length: 50, nullable: true })
  outflow: string;

  @CreateDateColumn()
  created_at: Date;
}

@Entity('fund_flow_historical')
// @Index('idx_fund_flow_historical_lookup', ['symbol', 'marketType', 'timeframe', 'createdAt'])
// @Index('idx_fund_flow_historical_datetime', ['symbol', 'marketType', 'timeframe', 'dateTime'])
export class FundFlowHistorical {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Symbol)
  @JoinColumn({ name: 'symbol_id' })
  symbol: Symbol;

  @ManyToOne(() => MarketType)
  @JoinColumn({ name: 'market_type_id' })
  marketType: MarketType;

  @ManyToOne(() => Timeframe)
  @JoinColumn({ name: 'timeframe_id' })
  timeframe: Timeframe;

  @Column({ length: 50 })
  date_time: string;

  @Column({ length: 50, nullable: true })
  inflow: string;

  @Column({ length: 50, nullable: true })
  outflow: string;

  @Column({ length: 50, nullable: true })
  net_inflow: string;

  @CreateDateColumn()
  created_at: Date;
}
