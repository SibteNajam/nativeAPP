import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Unique } from 'typeorm';

@Entity('fredindicators')
@Unique(['name', 'observation_date'])
export class FredIndicatorData {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'numeric', precision: 15, scale: 8 })
  value: number;

  @Column({ type: 'date' })
  observation_date: Date;

  @CreateDateColumn()
  created_at: Date;
}
