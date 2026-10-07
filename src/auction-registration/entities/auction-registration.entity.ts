import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Contract } from '../../contract/entities/contract.entity';

export enum RegistrationPaymentStatus {
  CHUA_NOP = 'CHUA_NOP',
  DA_NOP = 'DA_NOP',
}
export enum RegistrationStatus {
  CHUA_DU_DIEU_KIEN = 'CHUA_DU_DIEU_KIEN',
  DU_DIEU_KIEN = 'DU_DIEU_KIEN',
}

@Entity('auction_registration')
export class AuctionRegistration {
  @PrimaryGeneratedColumn({ name: 'auction_registration_id' })
  id!: number;

  @ManyToOne(() => Contract, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'contract_id' })
  contract!: Contract;

  @Column({ name: 'registrant_name', length: 255 })
  registrantName!: string;

  @Column({ name: 'identity_number', length: 100 })
  identityNumber!: string;

  @Column({ type: 'text' })
  address!: string;

  @Column({
    name: 'registration_fee',
    type: 'decimal',
    precision: 18,
    scale: 2,
  })
  registrationFee!: string;

  @Column({
    name: 'registration_fee_status',
    type: 'varchar',
    length: 20,
    default: RegistrationPaymentStatus.CHUA_NOP,
  })
  registrationFeeStatus!: RegistrationPaymentStatus;

  @Column({ name: 'registration_fee_paid_date', type: 'date', nullable: true })
  registrationFeePaidDate!: string | null;

  @Column({ name: 'deposit_amount', type: 'decimal', precision: 18, scale: 2 })
  depositAmount!: string;

  @Column({
    name: 'deposit_amount_status',
    type: 'varchar',
    length: 20,
    default: RegistrationPaymentStatus.CHUA_NOP,
  })
  depositAmountStatus!: RegistrationPaymentStatus;

  @Column({ name: 'deposit_amount_paid_date', type: 'date', nullable: true })
  depositAmountPaidDate!: string | null;

  @Column({ type: 'text', nullable: true })
  note!: string | null;

  @Column({
    type: 'varchar',
    length: 30,
    default: RegistrationStatus.CHUA_DU_DIEU_KIEN,
  })
  status!: RegistrationStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
