import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Contract } from '../../contract/entities/contract.entity';

@Entity('auction_result')
export class AuctionResult {
  @PrimaryGeneratedColumn({ name: 'auction_result_id' })
  id!: number;

  @Index()
  @Column({ name: 'auction_result_number', length: 100, unique: true })
  auctionResultNumber!: string;

  @Column({ type: 'jsonb' })
  winner!: Record<string, unknown>;

  @Column({ name: 'winning_price', type: 'decimal', precision: 18, scale: 2 })
  winningPrice!: string;

  @Column({ name: 'completed_at', type: 'timestamp with time zone' })
  completedAt!: Date;

  @Column({ name: 'auction_status', length: 50 })
  auctionStatus!: string;

  @ManyToOne(() => Contract, (contract) => contract.auctionResults, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'contract_id' })
  contract!: Contract;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
