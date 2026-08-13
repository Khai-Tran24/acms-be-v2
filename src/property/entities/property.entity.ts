import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ContractProperty } from './contract-property.entity';
import { PropertyType } from 'src/shared/enums/property.enum';

@Entity('property')
export class Property {
  @PrimaryGeneratedColumn({ name: 'property_id' })
  id!: number;

  @Column({ name: 'property_name', length: 255 })
  propertyName!: string;

  @Column({
    name: 'property_type',
    type: 'enum',
    enum: PropertyType,
    default: PropertyType.TAI_SAN_KHAC,
  })
  propertyType!: PropertyType;

  @OneToMany(() => ContractProperty, (item) => item.property)
  contractProperties!: ContractProperty[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
