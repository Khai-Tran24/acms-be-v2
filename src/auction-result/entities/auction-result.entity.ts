import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Contract } from '../../contract/entities/contract.entity';
import { FileEntity } from '../../file/entity/file.entity';

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

  @Column({
    name: 'auction_cost',
    type: 'jsonb',
    default: () => "'[]'::jsonb",
  })
  auctionCost!: unknown[];

  @Column({ name: 'completed_at', type: 'timestamp with time zone' })
  completedAt!: Date;

  @ManyToOne(() => Contract, (contract) => contract.auctionResults, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'contract_id' })
  contract!: Contract;

  @OneToMany(() => FileEntity, (file) => file.auctionResult)
  files!: FileEntity[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
