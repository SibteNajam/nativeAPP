import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    ManyToOne,
    UpdateDateColumn,
    CreateDateColumn,
  } from 'typeorm';
  import { User } from 'src/user/entities/user.entity';
  import { ApiProperty } from '@nestjs/swagger';
  
  @Entity('refreshtokens')
  export class RefreshToken {
    @ApiProperty()
    @PrimaryGeneratedColumn('uuid')
    id: string;
  
    @ApiProperty({ type: () => User })
    @ManyToOne(() => User, (user) => user.id)
    user: User;
  
    @ApiProperty()
    @Column()
    isRevoked: boolean;
  
    @ApiProperty()
    @Column()
    tokenExpiry: Date;
  
    @ApiProperty()
    @CreateDateColumn({
      type: 'timestamp',
      default: () => 'CURRENT_TIMESTAMP(6)',
    })
    createdAt: Date;
  
    @ApiProperty()
    @UpdateDateColumn({
      type: 'timestamp',
      default: () => 'CURRENT_TIMESTAMP(6)',
      onUpdate: 'CURRENT_TIMESTAMP(6)',
    })
    updatedAt: Date;
  
    @ApiProperty()
    @Column({ type: 'timestamp', default: null })
    deletedAt: Date;
  }
  