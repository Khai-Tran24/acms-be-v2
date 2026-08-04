import {
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Contract } from '../../contract/entities/contract.entity';
import { Property } from './property.entity';

@Entity('contract_property')
@Unique(['contract', 'property'])
export class ContractProperty {
  @PrimaryGeneratedColumn({ name: 'contract_property_id' })
  id!: number;

  @ManyToOne(() => Contract, (contract) => contract.contractProperties, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'contract_id' })
  contract!: Contract;

  @ManyToOne(() => Property, (property) => property.contractProperties, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'property_id' })
  property!: Property;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
