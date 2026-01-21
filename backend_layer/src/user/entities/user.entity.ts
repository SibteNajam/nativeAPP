import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { ApiProperty, ApiHideProperty } from '@nestjs/swagger';

@Entity('users')
export class User {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty()
  @Column({ name: 'email', unique: false })
  email: string;

  @ApiProperty()
  @Column({ name: 'name', unique: false })
  name: string;

  @ApiProperty()
  @Column({
    name: 'date_of_birth',
    type: 'timestamp',
    nullable: true,
    default: () => 'CURRENT_TIMESTAMP AT TIME ZONE \'UTC\'',
  })
  dateOfBirth: Date;

  @ApiHideProperty()
  @Column({ name: 'password', nullable: true })
  @Exclude()
  password: string;

  @Column({ name: 'is_deleted', default: false })
  isDeleted: boolean;

  @Exclude()
  @ApiHideProperty()
  @Column({ name: 'is_verified', default: false })
  isVerified: boolean;

  @ApiProperty()
  @Exclude()
  @Column({
    name: 'password_updated_at',
    type: 'timestamp',
    nullable: true,
    default: () => 'CURRENT_TIMESTAMP AT TIME ZONE \'UTC\'',
  })
  passwordUpdatedAt: Date;

  @ApiProperty()
  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP(6) AT TIME ZONE \'UTC\'',
  })
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP(6) AT TIME ZONE \'UTC\'',
    onUpdate: 'CURRENT_TIMESTAMP(6) AT TIME ZONE \'UTC\'',
  })
  updatedAt: Date;

  @ApiProperty()
  @Column({ name: 'secret_token', nullable: true })
  secretToken: string;

  @ApiProperty()
  @Column({
    name: 'secret_token_created_at',
    type: 'timestamp',
    nullable: true,
  })
  secretTokenCreatedAt: Date;

  // OTP Verification Fields
  @ApiHideProperty()
  @Column({ name: 'otp_code', nullable: true })
  @Exclude()
  otpCode: string;

  @ApiHideProperty()
  @Column({
    name: 'otp_expires_at',
    type: 'timestamp',
    nullable: true,
  })
  @Exclude()
  otpExpiresAt: Date;

  @ApiHideProperty()
  @Column({ name: 'otp_attempts', default: 0 })
  @Exclude()
  otpAttempts: number;
}