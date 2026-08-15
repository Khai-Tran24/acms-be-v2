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

@Entity('regulation')
export class Regulation {
  @PrimaryGeneratedColumn({ name: 'regulation_id' })
  id!: number;

  @Index()
  @Column({ name: 'regulation_number', length: 100, unique: true })
  regulationNumber!: string;

  @Column({ name: 'starting_price', type: 'decimal', precision: 18, scale: 2 })
  startingPrice!: string;

  @Column({ name: 'deposit_amount', type: 'decimal', precision: 18, scale: 2 })
  depositAmount!: string;

  @Column({ name: 'step_price', type: 'decimal', precision: 18, scale: 2 })
  stepPrice!: string;

  @Column({
    name: 'registration_fee',
    type: 'decimal',
    precision: 18,
    scale: 2,
  })
  registrationFee!: string;

  @Column({ name: 'start_register_date', type: 'timestamp with time zone' })
  startRegisterDate!: Date;

  @Column({ name: 'end_register_date', type: 'timestamp with time zone' })
  endRegisterDate!: Date;

  @Column({ name: 'auction_date', type: 'timestamp with time zone' })
  auctionDate!: Date;

  @Column({ name: 'auction_time', type: 'smallint' })
  auctionTime!: number;

  @Column({ name: 'auction_format', length: 100 })
  auctionFormat!: string;

  @Column({ name: 'auction_method', length: 100 })
  auctionMethod!: string;

  @ManyToOne(() => Contract, (contract) => contract.regulations, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'contract_id' })
  contract!: Contract;

  @OneToMany(() => FileEntity, (file) => file.regulation)
  files!: FileEntity[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
