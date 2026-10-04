import { BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { userInfo } from 'node:os';
import { Contract } from '../contract/entities/contract.entity';
import { ContractService } from '../contract/contract.service';
import { QueryContractDto } from '../contract/dto/query-contract.dto';
import {
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
      {} as UploadFileServiceS3,
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
      auctionFormat: 'Trực tiếp',
      auctionMethod: 'Trả giá lên',
    };
    return announcement
      ? db
          .getRepository(Announcement)
          .save({ ...data, announcementNumber: `TB-${++sequence}` })
      : db
          .getRepository(Regulation)
          .save({ ...data, regulationNumber: `QC-${++sequence}` });
  };

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
        assignedTo: officer,
        createdBy: officer,
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
