import { readFileSync } from 'node:fs';
import { userInfo } from 'node:os';
import { resolve } from 'node:path';
import { DataSource } from 'typeorm';
import { Regulation } from '../regulation/entities/regulation.entity';
import { Contract } from '../contract/entities/contract.entity';
import { ContractService } from '../contract/contract.service';
import { QueryContractDto } from '../contract/dto/query-contract.dto';
import { ContractStatus, ContractType } from '../shared/enums/contract.enum';
import { User } from '../user/entities/user.entity';
import { Property } from '../property/entities/property.entity';
import { ContractProperty } from '../property/entities/contract-property.entity';
import type { UploadFileServiceS3 } from '../file/upload-file.service';
import { AuctionResult } from '../auction-result/entities/auction-result.entity';
import { AuctionResultService } from '../auction-result/auction-result.service';
import { QueryAuctionResultDto } from '../auction-result/dto/query-auction-result.dto';
import { Announcement } from '../announcement/entities/announcement.entity';
import { AuctionRegistrationService } from './auction-registration.service';
import {
  AuctionRegistration,
  RegistrationPaymentStatus,
  RegistrationStatus,
} from './entities/auction-registration.entity';
import { QueryAuctionRegistrationDto } from './dto/query-auction-registration.dto';

const socket = process.env.REGISTRATION_TEST_SOCKET;
const integration = socket?.startsWith('/tmp/auction-registration-test.')
  ? describe
  : describe.skip;

integration('Auction registrations (isolated PostgreSQL)', () => {
  let db: DataSource;
  let service: AuctionRegistrationService;
  beforeAll(async () => {
    db = await new DataSource({
      type: 'postgres',
      host: socket,
      username: userInfo().username,
      database: 'registrations_test',
      dropSchema: true,
      synchronize: true,
      entities: [resolve(__dirname, '../**/*.entity.ts')],
    }).initialize();
    service = new AuctionRegistrationService(
      db.getRepository(AuctionRegistration),
      db.getRepository(Contract),
    );
  });
  afterAll(async () => {
    if (db?.isInitialized) await db.destroy();
  });

  it('round trips all registration fields and searches contracts by number', async () => {
    const parent = await db.getRepository(Contract).save({
      contractNumber: 'HD-PARENT',
      startingPrice: '100',
      stepPrice: '10',
    });
    const contract = await db.getRepository(Contract).save({
      contractNumber: 'HD-REG',
      parentContract: parent,
      startingPrice: '100',
      stepPrice: '10',
    });
    await db.getRepository(Regulation).save({
      contract,
      regulationNumber: 'QC-REG',
      startingPrice: '100',
      depositAmount: '20',
      registrationFee: '5',
      stepPrice: '10',
      startRegisterDate: new Date('2026-10-01T00:00:00+07:00'),
      endRegisterDate: new Date('2026-10-10T23:00:00+07:00'),
      auctionDate: new Date('2026-10-12T09:00:00+07:00'),
    });
    const lookup = await service.contractOption(contract.id);
    expect(lookup.regulations[0].registrationFee).toBe('5.00');
    expect(lookup.regulations[0].depositAmount).toBe('20.00');
    expect(lookup.regulations[0].startRegisterDate.toISOString()).toBe(
      '2026-09-30T17:00:00.000Z',
    );
    const saved = await service.create({
      contractId: contract.id,
      registrantName: 'Nguyễn Văn A',
      identityNumber: '001234567890',
      address: 'Hà Nội',
      registrationFee: 100000,
      registrationFeeStatus: RegistrationPaymentStatus.DA_NOP,
      registrationFeePaidDate: '2026-10-07',
      depositAmount: 2000000,
      depositAmountStatus: RegistrationPaymentStatus.CHUA_NOP,
      depositAmountPaidDate: null,
      note: 'Kiểm tra hồ sơ',
      status: RegistrationStatus.CHUA_DU_DIEU_KIEN,
    });
    const loaded = await service.findOne(saved.id);
    expect(loaded.registrantName).toBe(saved.registrantName);
    expect(loaded.identityNumber).toBe('001234567890');
    expect(loaded.registrationFee).toBe('100000.00');
    expect(loaded.depositAmount).toBe('2000000.00');
    expect(loaded.registrationFeePaidDate).toBe('2026-10-07');
    expect(loaded.note).toBe('Kiểm tra hồ sơ');
    expect(loaded.contract.parentContract?.contractNumber).toBe('HD-PARENT');
    for (const search of ['Nguyễn', '001234567890', 'HD-REG', 'HD-PARENT']) {
      const results = await service.findAll(
        Object.assign(new QueryAuctionRegistrationDto(), {
          search,
          page: 1,
          limit: 1,
        }),
      );
      expect(results.items.map((item) => item.id)).toEqual([saved.id]);
      expect(results.pagination).toMatchObject({ total: 1, totalPages: 1 });
    }
    const options = await service.contractOptions(
      Object.assign(new QueryAuctionRegistrationDto(), { search: 'HD-REG' }),
    );
    expect(options.items[0]).toMatchObject({
      id: contract.id,
      contractNumber: 'HD-REG',
      parentContract: { contractNumber: 'HD-PARENT' },
    });
    expect(options.items[0].customer).toBeUndefined();
    await service.update(saved.id, {
      registrationFeePaidDate: null,
      depositAmountStatus: RegistrationPaymentStatus.DA_NOP,
      depositAmountPaidDate: '2026-10-08',
      note: '',
      status: RegistrationStatus.DU_DIEU_KIEN,
    });
    expect(await service.findOne(saved.id)).toMatchObject({
      registrationFeePaidDate: null,
      depositAmountPaidDate: '2026-10-08',
      note: '',
      status: 'DU_DIEU_KIEN',
    });
    await expect(
      db.getRepository(Contract).delete(contract.id),
    ).rejects.toThrow();
    await service.remove(saved.id);
    await expect(service.findOne(saved.id)).rejects.toThrow();
  });

  it('filters selectable contracts before search pagination while preserving saved links and other lists', async () => {
    const contracts = new ContractService(
      db.getRepository(Contract),
      db.getRepository(User),
      db.getRepository(Property),
      db.getRepository(ContractProperty),
      {
        activeFiles: jest.fn().mockResolvedValue([]),
      } as unknown as UploadFileServiceS3,
    );
    const seeded = await db.getRepository(Contract).save(
      Object.values(ContractStatus).map((contractStatus) => ({
        contractNumber: `CHOICE-${contractStatus}`,
        contractStatus,
        startingPrice: '100',
        stepPrice: '10',
      })),
    );
    const expectedIds = seeded
      .filter((item) =>
        [
          ContractStatus.MOI,
          ContractStatus.DANG_DAU_GIA,
          ContractStatus.DAU_GIA_KHONG_THANH,
        ].includes(item.contractStatus),
      )
      .map((item) => item.id)
      .sort((a, b) => a - b);
    const selectedIds: number[] = [];
    const registrationIds: number[] = [];
    for (const page of [1, 2]) {
      const result = await contracts.findAll(
        Object.assign(new QueryContractDto(), {
          search: 'CHOICE-',
          selectableOnly: true,
          limit: 2,
          page,
          sortBy: 'id',
          sortOrder: 'ASC',
        }),
      );
      expect(result.pagination).toMatchObject({ total: 3, totalPages: 2 });
      selectedIds.push(...result.items.map((item) => item.id));
      const options = await service.contractOptions(
        Object.assign(new QueryAuctionRegistrationDto(), {
          search: 'CHOICE-',
          limit: 2,
          page,
          sortOrder: 'ASC',
        }),
      );
      expect(options.pagination).toMatchObject({ total: 3, totalPages: 2 });
      registrationIds.push(...options.items.map((item) => item.id));
    }
    const original = seeded.find(
      (item) => item.contractStatus === ContractStatus.MOI,
    )!;
    const child = await contracts.create({
      parentContractId: original.id,
      contractStatus: ContractStatus.MOI,
      startingPrice: 100,
      stepPrice: 10,
    });
    const parentOptions = await contracts.findAll(
      Object.assign(new QueryContractDto(), {
        search: 'CHOICE-',
        selectableOnly: true,
        contractType: ContractType.HOP_DONG_MOI,
      }),
    );
    expect(
      parentOptions.items.map((item) => item.id).sort((a, b) => a - b),
    ).toEqual(expectedIds);
    await expect(
      contracts.create({
        parentContractId: child.id,
        contractStatus: ContractStatus.MOI,
        startingPrice: 100,
        stepPrice: 10,
      }),
    ).rejects.toThrow('Hợp đồng cha phải');
    const otherOriginal = seeded.find(
      (item) => item.contractStatus === ContractStatus.DANG_DAU_GIA,
    )!;
    await expect(
      contracts.update(otherOriginal.id, { parentContractId: child.id }),
    ).rejects.toThrow('Hợp đồng cha phải');
    await expect(
      contracts.update(original.id, { parentContractId: otherOriginal.id }),
    ).rejects.toThrow('đang có hợp đồng con');
    await contracts.remove(child.id);
    expect(selectedIds).toEqual(expectedIds);
    expect(registrationIds).toEqual(expectedIds);
    const all = await contracts.findAll(
      Object.assign(new QueryContractDto(), { search: 'CHOICE-' }),
    );
    expect(all.pagination.total).toBe(6);
    const results = await contracts.findAll(
      Object.assign(new QueryContractDto(), {
        search: 'CHOICE-',
        contractStatus: ContractStatus.DAU_GIA_THANH,
      }),
    );
    expect(results.items).toHaveLength(1);
    for (const item of seeded) {
      await expect(service.contractOption(item.id)).resolves.toMatchObject({
        id: item.id,
      });
      await expect(contracts.findOne(item.id)).resolves.toMatchObject({
        id: item.id,
      });
    }
  });

  it('persists auction result notes without changing winner JSON', async () => {
    const contract = await db
      .getRepository(Contract)
      .findOneByOrFail({ contractNumber: 'HD-REG' });
    const repo = db.getRepository(AuctionResult);
    const result = await repo.save({
      contract,
      auctionResultNumber: 'KQ-REG',
      winner: {
        name: 'Nguyễn Văn A',
        identityNumber: '001234567890',
        address: 'Hà Nội',
      },
      winningPrice: '200',
      completedAt: new Date(),
      note: 'Ghi chú kết quả',
    });
    expect(await repo.findOneByOrFail({ id: result.id })).toMatchObject({
      winner: result.winner,
      note: 'Ghi chú kết quả',
    });
    await repo.update(result.id, { note: null });
    expect((await repo.findOneByOrFail({ id: result.id })).note).toBeNull();
  });

  it('returns auction starting prices from the latest terms on result lists and details', async () => {
    const contract = await db.getRepository(Contract).save({
      contractNumber: 'PRICE-COMPARISON',
      contractStatus: ContractStatus.DAU_GIA_THANH,
      startingPrice: '100',
      stepPrice: '10',
    });
    const terms = {
      contract,
      startingPrice: '200',
      stepPrice: '10',
      registrationFee: '5',
      depositAmount: '20',
      startRegisterDate: new Date('2026-10-01'),
      endRegisterDate: new Date('2026-10-02'),
      auctionDate: new Date('2026-10-03'),
    };
    await db
      .getRepository(Regulation)
      .save({ ...terms, regulationNumber: 'PRICE-QC' });
    await db
      .getRepository(Announcement)
      .save({ ...terms, startingPrice: '300', announcementNumber: 'PRICE-TB' });
    const results = new AuctionResultService(
      db.getRepository(AuctionResult),
      db.getRepository(Contract),
      {
        activeFiles: jest.fn().mockResolvedValue([]),
      } as unknown as UploadFileServiceS3,
    );
    const created = await results.create({
      contractId: contract.id,
      auctionResultNumber: 'PRICE-KQ',
      winningPrice: 400,
      winner: { name: 'Winner' },
      auctionCost: [],
      completedAt: '2026-10-04',
    });
    const detail = await results.findOne(created.id);
    expect(detail.startingPrice).toBe('300.00');
    expect(detail.winningPrice).toBe('400.00');
    expect(detail.contract).not.toHaveProperty('announcements');
    const list = await results.findAll(
      Object.assign(new QueryAuctionResultDto(), {
        contractId: contract.id,
        limit: 1,
      }),
    );
    expect(list.pagination.total).toBe(1);
    expect(list.items[0].startingPrice).toBe(detail.startingPrice);
    await results.update(created.id, { winningPrice: 500 });
    expect((await results.findOne(created.id)).winningPrice).toBe('500.00');
  });

  it('upgrades an old schema and is safe to rerun', async () => {
    const runner = db.createQueryRunner();
    await runner.connect();
    try {
      await runner.query('CREATE SCHEMA registration_migration_test');
      await runner.query('SET search_path TO registration_migration_test');
      await runner.query("CREATE TYPE user_role_enum AS ENUM ('ADMIN')");
      await runner.query(
        'CREATE TABLE contract (contract_id serial PRIMARY KEY)',
      );
      await runner.query(
        'CREATE TABLE auction_result (auction_result_id serial PRIMARY KEY)',
      );
      const migration = readFileSync(
        resolve(
          __dirname,
          '../../migrations/20261007-auction-registrations.sql',
        ),
        'utf8',
      );
      await runner.query(migration);
      await runner.query(migration);
      await runner.query("SELECT 'NHAN_VIEN_BAN_HO_SO'::user_role_enum");
      await runner.query(
        "INSERT INTO auction_result (note) VALUES ('ghi chú')",
      );
      await runner.query('INSERT INTO contract DEFAULT VALUES');
      await runner.query(
        "INSERT INTO auction_registration (contract_id, registrant_name, identity_number, address, registration_fee, deposit_amount) VALUES (1, 'A', '001234', 'HCM', 100, 200)",
      );
      const rows = (await runner.query(
        'SELECT status, registration_fee_status FROM auction_registration',
      )) as { status: string; registration_fee_status: string }[];
      expect(rows[0]).toEqual({
        status: 'CHUA_DU_DIEU_KIEN',
        registration_fee_status: 'CHUA_NOP',
      });
    } finally {
      await runner.query('SET search_path TO public');
      await runner.query(
        'DROP SCHEMA IF EXISTS registration_migration_test CASCADE',
      );
      await runner.release();
    }
  });
});
