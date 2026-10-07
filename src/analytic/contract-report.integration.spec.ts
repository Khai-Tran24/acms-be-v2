import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { userInfo } from 'node:os';
import { Contract } from '../contract/entities/contract.entity';
import { ContractService } from '../contract/contract.service';
import { QueryContractDto } from '../contract/dto/query-contract.dto';
import {
  AuctionFormat,
  AuctionMethod,
  ContractStatus,
  ContractType,
  ContractPropertyOwnerType,
} from '../shared/enums/contract.enum';
import { Property } from '../property/entities/property.entity';
import { ContractProperty } from '../property/entities/contract-property.entity';
import { User } from '../user/entities/user.entity';
import { Regulation } from '../regulation/entities/regulation.entity';
import { Announcement } from '../announcement/entities/announcement.entity';
import { AuctionResult } from '../auction-result/entities/auction-result.entity';
import { FileEntity } from '../file/entity/file.entity';
import { UploadFileServiceS3 } from '../file/upload-file.service';
import { AnalyticService } from './analytic.service';
import { RegulationService } from '../regulation/regulation.service';
import { AnnouncementService } from '../announcement/announcement.service';
import { QueryRegulationDto } from '../regulation/dto/query-regulation.dto';
import { QueryAnnouncementDto } from '../announcement/dto/query-announcement.dto';

// Opt in only with an isolated PostgreSQL socket, never the application DB.
const socket = process.env.REPORT_TEST_SOCKET;
const integration = socket?.startsWith('/tmp/auction-report-test.')
  ? describe
  : describe.skip;

integration('Contract reports and upcoming auctions (PostgreSQL)', () => {
  let db: DataSource;
  let reports: ContractService;
  let analytics: AnalyticService;
  let sequence = 0;
  const daysFromNow = (days: number) => new Date(Date.now() + days * 86400000);

  beforeAll(async () => {
    db = await new DataSource({
      type: 'postgres',
      host: socket,
      username: userInfo().username,
      database: 'reports_test',
      synchronize: true,
      entities: [
        Contract,
        Property,
        ContractProperty,
        User,
        Regulation,
        Announcement,
        AuctionResult,
        FileEntity,
      ],
    }).initialize();
    reports = new ContractService(
      db.getRepository(Contract),
      db.getRepository(User),
      db.getRepository(Property),
      db.getRepository(ContractProperty),
      {
        activeFiles: () => Promise.resolve([]),
      } as unknown as UploadFileServiceS3,
    );
    analytics = new AnalyticService(
      db.getRepository(Contract),
      db.getRepository(AuctionResult),
      db.getRepository(ContractProperty),
      db.getRepository(User),
    );
  });
  afterAll(async () => {
    if (db?.isInitialized) await db.destroy();
  });
  beforeEach(async () => {
    await db.query(
      'TRUNCATE TABLE contract, property, "user" RESTART IDENTITY CASCADE',
    );
  });

  const contract = (
    status = ContractStatus.MOI,
    date = '2026-01-31',
    price = '100',
  ) =>
    db.getRepository(Contract).save({
      contractNumber: `HD-${++sequence}`,
      contractStatus: status,
      contractDate: new Date(date),
      startingPrice: price,
      stepPrice: '10',
    });
  const schedule = async (
    owner: Contract,
    days: number,
    announcement = false,
  ) => {
    const data = {
      contract: owner,
      startingPrice: '100',
      stepPrice: '10',
      depositAmount: '20',
      registrationFee: '5',
      startRegisterDate: daysFromNow(-5),
      endRegisterDate: daysFromNow(days - 1),
      auctionDate: daysFromNow(days),
      auctionTime: 60,
      auctionFormat: AuctionFormat.DAU_GIA_TRUC_TIEP_BANG_LOI_NO,
      auctionMethod: AuctionMethod.TRA_GIA_LEN,
    };
    return announcement
      ? db
          .getRepository(Announcement)
          .save({ ...data, announcementNumber: `TB-${++sequence}` })
      : db
          .getRepository(Regulation)
          .save({ ...data, regulationNumber: `QC-${++sequence}` });
  };

  const create = (extra = {}) =>
    reports.create({
      contractStatus: ContractStatus.MOI,
      startingPrice: 100,
      stepPrice: 10,
      ...extra,
    });

  it('derives types, allows missing numbers, and inherits properties for resales', async () => {
    const asset = await db
      .getRepository(Property)
      .save({ propertyName: 'Resale asset' });
    const root = await create({
      contractNumber: '  ROOT-1  ',
      propertyIds: [asset.id],
    });
    const child = await create({ parentContractId: root.id });
    const sibling = await create({
      parentContractId: root.id,
      contractNumber: '',
      propertyIds: [],
    });
    expect(root.contractType).toBe(ContractType.HOP_DONG_MOI);
    expect(root.contractNumber).toBe('ROOT-1');
    expect(child.contractType).toBe(ContractType.HOP_DONG_SUA_DOI_BO_SUNG);
    expect(child.contractNumber).toBeNull();
    expect(child.parentContract?.id).toBe(root.id);
    expect(child.contractProperties.map((link) => link.property.id)).toEqual([
      asset.id,
    ]);
    expect(sibling.contractNumber).toBeNull();
    expect(sibling.contractProperties).toEqual([]);
    expect(
      (await reports.findOne(root.id)).childContracts
        .map((item) => item.id)
        .sort(),
    ).toEqual([child.id, sibling.id]);
    await expect(create({ contractNumber: 'ROOT-1' })).rejects.toThrow(
      ConflictException,
    );
    await expect(
      reports.update(child.id, { contractNumber: 'ROOT-1' }),
    ).rejects.toThrow(ConflictException);
  });

  it('rejects amendment parents, derives types on update, and prevents orphaning children', async () => {
    const root = await create();
    const child = await create({ parentContractId: root.id });
    await expect(create({ parentContractId: child.id })).rejects.toThrow(
      BadRequestException,
    );
    const grandchild = await create({ parentContractId: root.id });
    await expect(create({ parentContractId: 99999 })).rejects.toThrow(
      BadRequestException,
    );
    await expect(
      reports.update(root.id, { parentContractId: root.id }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      reports.update(root.id, { parentContractId: grandchild.id }),
    ).rejects.toThrow(BadRequestException);
    await expect(reports.remove(root.id)).rejects.toThrow(ConflictException);
    expect(
      (await reports.update(child.id, { startingPrice: 200 })).contractType,
    ).toBe(ContractType.HOP_DONG_SUA_DOI_BO_SUNG);
    expect(
      (await reports.update(grandchild.id, { parentContractId: null }))
        .contractType,
    ).toBe(ContractType.HOP_DONG_MOI);
    expect(
      (await reports.update(grandchild.id, { parentContractId: root.id }))
        .contractType,
    ).toBe(ContractType.HOP_DONG_SUA_DOI_BO_SUNG);
  });

  it('returns the complete family for number, property name/location and property ID searches', async () => {
    const asset = await db.getRepository(Property).save({
      propertyName: 'Resale building',
      propertyLocation: 'Unique location',
    });
    const root = await create({ contractNumber: 'ROOT-SEARCH' });
    const child = await create({
      parentContractId: root.id,
      contractNumber: 'CHILD-SEARCH',
      propertyIds: [asset.id],
    });
    // Legacy nested amendments remain searchable even though new nesting is forbidden.
    const grandchild = await db.getRepository(Contract).save({
      parentContractId: child.id,
      contractType: ContractType.HOP_DONG_SUA_DOI_BO_SUNG,
      startingPrice: '100',
      stepPrice: '10',
    });
    const sibling = await create({ parentContractId: root.id });
    await create({ contractNumber: 'UNRELATED' });
    const expected = [root.id, child.id, grandchild.id, sibling.id];
    for (const filter of [
      { search: 'ROOT-SEARCH' },
      { search: 'CHILD-SEARCH' },
      { contractNumber: 'ROOT-SEARCH' },
      { contractNumber: 'CHILD-SEARCH' },
      { search: 'Resale building' },
      { search: 'Unique location' },
      { propertyId: asset.id },
    ]) {
      const query = Object.assign(new QueryContractDto(), filter, {
        sortBy: 'id',
        sortOrder: 'ASC',
        limit: 2,
      });
      const first = await reports.findAll(query);
      expect(first.items.map((item) => item.id)).toEqual(expected.slice(0, 2));
      expect(first.pagination.total).toBe(4);
      expect(
        (await reports.findAll({ ...query, page: 2 })).items.map(
          (item) => item.id,
        ),
      ).toEqual(expected.slice(2));
      expect(
        (await reports.findAllForExport(query)).map((item) => item.id),
      ).toEqual(expected);
      expect((await reports.getReport(query)).summary.totalContracts).toBe(4);
    }
  });

  it('filters PostgreSQL auction enums and supports keyword searches on both auction resources', async () => {
    const root = await contract();
    const regulation = await schedule(root, 2);
    const announcement = await schedule(root, 2, true);
    const regulations = new RegulationService(
      db.getRepository(Regulation),
      db.getRepository(Contract),
      {} as UploadFileServiceS3,
    );
    const announcements = new AnnouncementService(
      db.getRepository(Announcement),
      db.getRepository(Contract),
      {} as UploadFileServiceS3,
    );
    const filter = {
      search: 'TRA_GIA_LEN',
      auctionMethod: AuctionMethod.TRA_GIA_LEN,
      auctionFormat: AuctionFormat.DAU_GIA_TRUC_TIEP_BANG_LOI_NO,
    };
    expect(
      (
        await regulations.findAll(
          Object.assign(new QueryRegulationDto(), filter),
        )
      ).items.map((item) => item.id),
    ).toEqual([regulation.id]);
    expect(
      (
        await announcements.findAll(
          Object.assign(new QueryAnnouncementDto(), filter),
        )
      ).items.map((item) => item.id),
    ).toEqual([announcement.id]);
    await db
      .getRepository(Announcement)
      .update(announcement.id, { auctionFormat: null, auctionMethod: null });
    expect(
      (
        await announcements.findAll(
          Object.assign(new QueryAnnouncementDto(), filter),
        )
      ).items,
    ).toEqual([]);
  });

  it('rolls back contract creation and updates when a property is invalid', async () => {
    const root = await create();
    await expect(
      create({ parentContractId: root.id, propertyIds: [99999] }),
    ).rejects.toThrow(BadRequestException);
    expect(await db.getRepository(Contract).count()).toBe(1);
    const child = await create({ parentContractId: root.id });
    await expect(
      reports.update(child.id, {
        parentContractId: null,
        propertyIds: [99999],
      }),
    ).rejects.toThrow(BadRequestException);
    expect((await reports.findOne(child.id)).parentContractId).toBe(root.id);
  });

  it.each([false, true])(
    'migrates legacy schema safely (unknown value: %s)',
    async (unknownValue) => {
      const runner = db.createQueryRunner();
      await runner.connect();
      try {
        await runner.query('CREATE SCHEMA migration_fixture');
        await runner.query('SET search_path TO migration_fixture, public');
        await runner.query(`
        CREATE TABLE contract (contract_id serial PRIMARY KEY, contract_number varchar(100) NOT NULL UNIQUE);
        CREATE TABLE regulation (auction_format varchar(100), auction_method varchar(100));
        CREATE TABLE announcement (auction_format varchar(100) NOT NULL, auction_method varchar(100) NOT NULL);
        INSERT INTO contract (contract_number) VALUES ('EXISTING');
        INSERT INTO regulation VALUES ('Trực tiếp', 'Trả giá lên'), ('', '');
        INSERT INTO announcement VALUES ('Bỏ phiếu gián tiếp', 'Đặt giá xuống');
      `);
        if (unknownValue)
          await runner.query(
            "UPDATE regulation SET auction_format = 'Unknown legacy value'",
          );
        const migration = readFileSync(
          resolve(
            __dirname,
            '../../migrations/20261006-contract-family-auction-enums.sql',
          ),
          'utf8',
        );
        if (unknownValue) {
          await expect(runner.query(migration)).rejects.toThrow(
            'invalid input value for enum',
          );
          await runner.query('ROLLBACK');
          expect(await runner.query('SELECT * FROM contract')).toEqual([
            { contract_id: 1, contract_number: 'EXISTING' },
          ]);
          expect(
            await runner.query('SELECT auction_format FROM regulation LIMIT 1'),
          ).toEqual([{ auction_format: 'Unknown legacy value' }]);
        } else {
          await runner.query(migration);
          expect(await runner.query('SELECT * FROM regulation')).toEqual([
            {
              auction_format: 'TRUC_TIEP_BANG_LOI_NO',
              auction_method: 'TRA_GIA_LEN',
            },
            { auction_format: null, auction_method: null },
          ]);
          expect(await runner.query('SELECT * FROM announcement')).toEqual([
            {
              auction_format: 'BANG_BO_PHIEU_GIAN_TIEP',
              auction_method: 'DAT_GIA_XUONG',
            },
          ]);
          await runner.query(
            'INSERT INTO contract (parent_contract_id) VALUES (1), (1)',
          );
          await expect(
            runner.query('DELETE FROM contract WHERE contract_id = 1'),
          ).rejects.toThrow();
          await expect(
            runner.query(
              'UPDATE contract SET parent_contract_id = contract_id',
            ),
          ).rejects.toThrow();
        }
      } finally {
        await runner.query('ROLLBACK');
        await runner.query('SET search_path TO public');
        await runner.query('DROP SCHEMA IF EXISTS migration_fixture CASCADE');
        await runner.release();
      }
    },
  );

  it('counts each contract once and uses its latest result across all pages', async () => {
    const first = await contract(ContractStatus.DAU_GIA_THANH);
    await contract(ContractStatus.MOI, '2026-02-01', '200');
    const assets = await db
      .getRepository(Property)
      .save([{ propertyName: 'Tài sản A' }, { propertyName: 'Tài sản B' }]);
    await db
      .getRepository(ContractProperty)
      .save(assets.map((property) => ({ contract: first, property })));
    await schedule(first, 1);
    await schedule(first, 2);
    await db.getRepository(AuctionResult).save([
      {
        contract: first,
        auctionResultNumber: 'KQ-A',
        winner: {},
        winningPrice: '150',
        completedAt: new Date('2026-02-01'),
      },
      {
        contract: first,
        auctionResultNumber: 'KQ-B',
        winner: {},
        winningPrice: '200',
        completedAt: new Date('2026-02-02'),
      },
    ]);
    const query = Object.assign(new QueryContractDto(), {
      limit: 1,
      sortBy: 'id',
      sortOrder: 'ASC',
    });
    const result = await reports.getReport(query);
    expect(result.summary).toEqual({
      totalContracts: 2,
      successfulContracts: 1,
      successRate: 50,
      totalStartingPrice: 300,
      totalWinningPrice: 200,
    });
    expect(result.items).toHaveLength(1);
    expect(result.items[0].winningPrice).toBe(200);
    expect(result.items[0].propertyNames).toHaveLength(2);
    expect(result.pagination.totalItems).toBe(2);
    expect(result.pagination.totalPages).toBe(2);
    expect((await reports.getReport({ ...query, page: 2 })).summary).toEqual(
      result.summary,
    );
  });

  it('applies keyword, status and inclusive contract-date filters to rows and totals', async () => {
    const included = await contract(ContractStatus.DAU_GIA_THANH);
    await contract(ContractStatus.MOI);
    await contract(ContractStatus.DAU_GIA_THANH, '2026-02-01');
    const result = await reports.getReport(
      Object.assign(new QueryContractDto(), {
        search: included.contractNumber,
        contractStatus: ContractStatus.DAU_GIA_THANH,
        contractDateFrom: '2026-01-31',
        contractDateTo: '2026-01-31',
      }),
    );
    expect(result.summary.totalContracts).toBe(1);
    expect(result.items.map((item) => item.id)).toEqual([included.id]);
  });

  it.each([
    'contractNumber',
    'contractType',
    'contractOwnerType',
    'assignedToId',
    'createdById',
    'propertyId',
    'createdFrom',
    'createdTo',
  ] as const)(
    'applies %s consistently to report totals and exported contracts',
    async (key) => {
      const officer = await db.getRepository(User).save({
        email: `report-${++sequence}@example.test`,
        username: `report-${sequence}`,
        fullName: 'Cán bộ báo cáo',
        password: 'unused-test-fixture',
      });
      const included = await contract();
      const excluded = await contract();
      const property = await db
        .getRepository(Property)
        .save({ propertyName: 'Tài sản báo cáo' });
      await db
        .getRepository(ContractProperty)
        .save({ contract: included, property });
      await db.getRepository(Contract).update(included.id, {
        contractType: ContractType.HOP_DONG_SUA_DOI_BO_SUNG,
        contractOwnerType: ContractPropertyOwnerType.TAI_SAN_CONG,
        assignedTo: { id: officer.id },
        createdBy: { id: officer.id },
        createdAt: new Date('2026-02-15T12:00:00Z'),
      });
      await db.getRepository(Contract).update(excluded.id, {
        createdAt: new Date(
          key === 'createdTo' ? '2026-03-01T12:00:00Z' : '2026-01-01T12:00:00Z',
        ),
      });
      const values = {
        contractNumber: included.contractNumber,
        contractType: ContractType.HOP_DONG_SUA_DOI_BO_SUNG,
        contractOwnerType: ContractPropertyOwnerType.TAI_SAN_CONG,
        assignedToId: officer.id,
        createdById: officer.id,
        propertyId: property.id,
        createdFrom: '2026-02-01T00:00:00Z',
        createdTo: '2026-02-28T23:59:59Z',
      };
      const query = Object.assign(new QueryContractDto(), {
        [key]: values[key],
      });
      const report = await reports.getReport(query);
      const exported = await reports.findAllForExport(query);
      expect(report.summary.totalContracts).toBe(1);
      expect(report.items.map((item) => item.id)).toEqual([included.id]);
      expect(exported.map((item) => item.id)).toEqual([included.id]);
    },
  );

  it('shares sorting with exports while exporting every matching page', async () => {
    const high = await contract(ContractStatus.MOI, '2026-01-01', '500');
    const low = await contract(ContractStatus.MOI, '2026-01-01', '100');
    const query = Object.assign(new QueryContractDto(), {
      sortBy: 'startingPrice',
      sortOrder: 'ASC',
      limit: 1,
    });
    expect(
      (await reports.getReport(query)).items.map((item) => item.id),
    ).toEqual([low.id]);
    expect(
      (await reports.findAllForExport(query)).map((item) => item.id),
    ).toEqual([low.id, high.id]);
  });

  it('rejects an inverted creation-time range', async () => {
    await expect(
      reports.getReport(
        Object.assign(new QueryContractDto(), {
          createdFrom: '2026-02-01T00:00:00Z',
          createdTo: '2026-01-01T00:00:00Z',
        }),
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('returns zero totals and empty rows when no contracts match', async () => {
    await contract();
    const result = await reports.getReport(
      Object.assign(new QueryContractDto(), { search: 'missing' }),
    );
    expect(result.items).toEqual([]);
    expect(result.summary.totalContracts).toBe(0);
    expect(result.summary.successRate).toBe(0);
    expect(result.summary.totalWinningPrice).toBe(0);
  });

  it('rejects an inverted date range', async () => {
    await expect(
      reports.getReport(
        Object.assign(new QueryContractDto(), {
          contractDateFrom: '2026-02-01',
          contractDateTo: '2026-01-01',
        }),
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('uses the latest regulation date and ignores announcement schedules', async () => {
    const first = await contract(ContractStatus.DANG_DAU_GIA);
    await schedule(first, 8);
    const latest = await schedule(first, 3);
    await schedule(first, 1, true);
    const second = await contract();
    await schedule(second, 2);
    const rows = await analytics.getUpcomingAuctions();
    expect(rows.map((row) => row.id)).toEqual([second.id, first.id]);
    expect(new Date(rows[1].auctionDate)).toEqual(latest.auctionDate);
    expect(rows[0].assignedOfficer).toBe('Chưa phân công');
  });

  it('excludes past and superseded regulation schedules and contracts without a regulation', async () => {
    const past = await contract();
    await schedule(past, -1);
    const superseded = await contract();
    await schedule(superseded, 2);
    await schedule(superseded, -1);
    await contract();
    expect(await analytics.getUpcomingAuctions()).toEqual([]);
  });

  it.each([
    ContractStatus.MOI,
    ContractStatus.DANG_DAU_GIA,
    ContractStatus.DAU_GIA_KHONG_THANH,
    ContractStatus.DA_HUY,
  ])(
    'includes a future regulation for eligible contract status %s',
    async (status) => {
      const owner = await contract(status);
      const regulation = await schedule(owner, 30);
      const rows = await analytics.getUpcomingAuctions();
      expect(rows).toHaveLength(1);
      expect(rows[0].id).toBe(owner.id);
      expect(rows[0].status).toBe(status);
      expect(new Date(rows[0].auctionDate)).toEqual(regulation.auctionDate);
    },
  );

  it.each([ContractStatus.DAU_GIA_THANH, ContractStatus.DA_THANH_LY])(
    'excludes future regulations for completed status %s',
    async (status) => {
      await schedule(await contract(status), 30);
      expect(await analytics.getUpcomingAuctions()).toEqual([]);
    },
  );

  it('returns only the nearest ten auctions with no duplicate asset rows', async () => {
    const expected: number[] = [];
    for (let day = 12; day >= 1; day--) {
      const owner = await contract();
      await schedule(owner, day);
      expected.unshift(owner.id);
      if (day === 1) {
        const assets = await db
          .getRepository(Property)
          .save([{ propertyName: 'A' }, { propertyName: 'B' }]);
        await db
          .getRepository(ContractProperty)
          .save(assets.map((property) => ({ contract: owner, property })));
      }
    }
    const rows = await analytics.getUpcomingAuctions();
    expect(rows.map((row) => row.id)).toEqual(expected.slice(0, 10));
    expect(rows[0].assetName).toBe('A, B');
  });
});
