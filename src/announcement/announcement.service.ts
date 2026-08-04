import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contract } from '../contract/entities/contract.entity';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { Announcement } from './entities/announcement.entity';
@Injectable()
export class AnnouncementService {
  constructor(
    @InjectRepository(Announcement)
    private readonly repo: Repository<Announcement>,
    @InjectRepository(Contract)
    private readonly contracts: Repository<Contract>,
  ) {}
  async create(dto: CreateAnnouncementDto) {
    const {
      contractId,
      startingPrice,
      depositAmount,
      stepPrice,
      registrationFee,
      ...data
    } = dto;
    this.validateDates(data);
    return this.repo.save(
      this.repo.create({
        ...data,
        startingPrice: String(startingPrice),
        depositAmount: String(depositAmount),
        stepPrice: String(stepPrice),
        registrationFee: String(registrationFee),
        startRegisterDate: new Date(data.startRegisterDate),
        endRegisterDate: new Date(data.endRegisterDate),
        auctionDate: new Date(data.auctionDate),
        contract: await this.contract(contractId),
      }),
    );
  }
  findAll() {
    return this.repo.find({
      relations: { contract: true },
      order: { auctionDate: 'DESC' },
    });
  }
  async findOne(id: number) {
    const item = await this.repo.findOne({
      where: { id },
      relations: { contract: true },
    });
    if (!item) throw new NotFoundException('Announcement not found');
    return item;
  }
  async update(id: number, dto: UpdateAnnouncementDto) {
    const item = await this.findOne(id);
    const { contractId, ...data } = dto;
    const dates = {
      startRegisterDate:
        data.startRegisterDate ?? item.startRegisterDate.toISOString(),
      endRegisterDate:
        data.endRegisterDate ?? item.endRegisterDate.toISOString(),
      auctionDate: data.auctionDate ?? item.auctionDate.toISOString(),
    };
    this.validateDates(dates);
    Object.assign(item, data, this.money(data), {
      startRegisterDate: new Date(dates.startRegisterDate),
      endRegisterDate: new Date(dates.endRegisterDate),
      auctionDate: new Date(dates.auctionDate),
    });
    if (contractId) item.contract = await this.contract(contractId);
    return this.repo.save(item);
  }
  async remove(id: number) {
    const result = await this.repo.delete(id);
    if (!result.affected) throw new NotFoundException('Announcement not found');
    return { message: 'Announcement deleted successfully' };
  }
  private validateDates(data: {
    startRegisterDate: string;
    endRegisterDate: string;
    auctionDate: string;
  }) {
    if (
      new Date(data.startRegisterDate) > new Date(data.endRegisterDate) ||
      new Date(data.endRegisterDate) > new Date(data.auctionDate)
    )
      throw new BadRequestException(
        'Dates must follow start registration, end registration, auction',
      );
  }
  private money<T extends Record<string, unknown>>(values: T) {
    const monetaryFields = new Set([
      'startingPrice',
      'depositAmount',
      'stepPrice',
      'registrationFee',
    ]);
    return Object.fromEntries(
      Object.entries(values).map(([key, value]) => [
        key,
        monetaryFields.has(key) && typeof value === 'number'
          ? String(value)
          : value,
      ]),
    );
  }
  private async contract(id: number) {
    const item = await this.contracts.findOneBy({ id });
    if (!item) throw new NotFoundException('Contract not found');
    return item;
  }
}
