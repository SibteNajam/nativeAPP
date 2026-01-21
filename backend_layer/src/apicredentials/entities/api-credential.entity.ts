import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { ApiProperty } from '@nestjs/swagger';

export enum ExchangeType {
  BINANCE = 'binance',
  BITGET = 'bitget',
  GATEIO = 'gateio',
  MEXC = 'mexc',
  ALPHA_VANTAGE = 'alpha_vantage',
}

@Entity('api_credentials')
@Index(['userId', 'exchange'], { unique: true }) // One credential per exchange per user
export class ApiCredential {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty()
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ApiProperty({ enum: ExchangeType })
  @Column({
    type: 'enum',
    enum: ExchangeType,
  })
  exchange: ExchangeType;

  @Column({ name: 'api_key', type: 'text' })
  apiKey: string; // Encrypted

  @Column({ name: 'secret_key', type: 'text' })
  secretKey: string; // Encrypted

  @Column({ name: 'passphrase', type: 'text', nullable: true })
  passphrase: string | null; // Encrypted, optional (for exchanges like Bitget)

  @ApiProperty()
  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @ApiProperty()
  @Column({ name: 'label', type: 'varchar', length: 100, nullable: true })
  label?: string; // User-friendly name like "My Binance Main"

  @ApiProperty({ description: 'Whether this credential is used for active trading (WebSocket order monitoring)' })
  @Column({ name: 'active_trading', default: false })
  activeTrading: boolean;

  @ApiProperty()
  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP AT TIME ZONE \'UTC\'',
  })
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP AT TIME ZONE \'UTC\'',
    onUpdate: 'CURRENT_TIMESTAMP AT TIME ZONE \'UTC\'',
  })
  updatedAt: Date;
}
