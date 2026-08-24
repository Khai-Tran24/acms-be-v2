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
import { FileEntity } from '../../file/entity/file.entity';
import {
  ContractPropertyOwnerType,
  ContractStatus,
  ContractType,
} from 'src/shared/enums/contract.enum';

@Entity('contract')
export class Contract {
  @PrimaryGeneratedColumn({ name: 'contract_id' })
  id!: number;

  @Index()
  @Column({ name: 'contract_number', length: 100, unique: true })
  contractNumber!: string;

  @Column({ name: 'contract_name', length: 255 })
  contractName!: string;

  @Column({
    name: 'contract_type',
    type: 'enum',
    enum: ContractType,
    default: ContractType.HOP_DONG_MOI,
  })
  contractType!: ContractType;

  @Column({
    name: 'contract_owner_type',
    type: 'enum',
    enum: ContractPropertyOwnerType,
    default: ContractPropertyOwnerType.TAI_SAN_THI_HANH_AN,
    nullable: true,
  })
  contractOwnerType!: ContractPropertyOwnerType;

  @Column({ name: 'contract_date', type: 'date', nullable: true })
  contractDate!: Date | null;

  @Index()
  @Column({
    name: 'contract_status',
    type: 'enum',
    enum: ContractStatus,
    default: ContractStatus.MOI,
  })
  contractStatus!: ContractStatus;

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

  @OneToMany(() => FileEntity, (file) => file.contract)
  files!: FileEntity[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
