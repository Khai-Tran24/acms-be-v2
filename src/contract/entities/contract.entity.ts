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
import { User } from '../../user/entities/user.entity';
import { ContractProperty } from '../../property/entities/contract-property.entity';
import { Regulation } from '../../regulation/entities/regulation.entity';
import { AuctionResult } from '../../auction-result/entities/auction-result.entity';
import { Announcement } from '../../announcement/entities/announcement.entity';

@Entity('contract')
export class Contract {
  @PrimaryGeneratedColumn({ name: 'contract_id' })
  id!: number;

  @Index()
  @Column({ name: 'contract_number', length: 100, unique: true })
  contractNumber!: string;

  @Column({ name: 'contract_name', length: 255 })
  contractName!: string;

  @Column({ name: 'contract_type', length: 50 })
  contractType!: string;

  @Index()
  @Column({ name: 'contract_year', type: 'smallint' })
  contractYear!: number;

  @Index()
  @Column({ name: 'contract_status', length: 50 })
  contractStatus!: string;

  @Column({ name: 'customer', type: 'jsonb', nullable: true })
  customer!: Record<string, unknown> | null;

  @Column({ name: 'starting_price', type: 'decimal', precision: 18, scale: 2 })
  startingPrice!: string;

  @Column({ name: 'step_price', type: 'decimal', precision: 18, scale: 2 })
  stepPrice!: string;

  @ManyToOne(() => User, (user) => user.assignedContracts, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'assigned_to' })
  assignedTo!: User | null;

  @ManyToOne(() => User, (user) => user.createdContracts, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'created_by' })
  createdBy!: User | null;

  @OneToMany(() => ContractProperty, (item) => item.contract)
  contractProperties!: ContractProperty[];

  @OneToMany(() => Regulation, (regulation) => regulation.contract)
  regulations!: Regulation[];

  @OneToMany(() => AuctionResult, (result) => result.contract)
  auctionResults!: AuctionResult[];

  @OneToMany(() => Announcement, (announcement) => announcement.contract)
  announcements!: Announcement[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
