import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuctionResult } from '../auction-result/entities/auction-result.entity';
import { Contract } from '../contract/entities/contract.entity';
import { ContractProperty } from '../property/entities/contract-property.entity';
import { ContractStatus } from '../shared/enums/contract.enum';
import { User } from '../user/entities/user.entity';
import { DashboardTimeframe } from './dto/dashboard-query.dto';

type NumericRow = Record<string, string | number | null>;

const numberOf = (value: unknown) => Number(value ?? 0);

@Injectable()
export class AnalyticService {
  constructor(
    @InjectRepository(Contract)
    private readonly contracts: Repository<Contract>,
    @InjectRepository(AuctionResult)
    private readonly auctionResults: Repository<AuctionResult>,
    @InjectRepository(ContractProperty)
    private readonly contractProperties: Repository<ContractProperty>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {}

  async getSummary() {
    const [contractStats, auctionStats, previousPeriodTotal] =
      await Promise.all([
        this.contracts
          .createQueryBuilder('contract')
          .select('COUNT(contract.id)', 'total')
          .addSelect(
            `COUNT(contract.id) FILTER (WHERE contract.contractStatus IN (:...inProgress))`,
            'inProgress',
          )
          .addSelect(
            `COUNT(contract.id) FILTER (WHERE contract.contractStatus IN (:...successful))`,
            'successful',
          )
          .setParameters({
            inProgress: [ContractStatus.MOI, ContractStatus.DANG_DAU_GIA],
            successful: [
              ContractStatus.DAU_GIA_THANH,
              ContractStatus.DA_THANH_LY,
            ],
          })
          .getRawOne<NumericRow>(),
        this.auctionResults
          .createQueryBuilder('result')
          .select('COALESCE(SUM(result.winningPrice), 0)', 'totalValue')
          .getRawOne<NumericRow>(),
        this.contracts
          .createQueryBuilder('contract')
          .where(
            `contract.createdAt >= date_trunc('month', CURRENT_DATE) - interval '1 month'`,
          )
          .andWhere(`contract.createdAt < date_trunc('month', CURRENT_DATE)`)
          .getCount(),
      ]);

    const total = numberOf(contractStats?.total);
    const successful = numberOf(contractStats?.successful);
    const currentMonthTotal = await this.contracts
      .createQueryBuilder('contract')
      .where(`contract.createdAt >= date_trunc('month', CURRENT_DATE)`)
      .getCount();

    return {
      totalFiles: total,
      totalSuccessfulValue: numberOf(auctionStats?.totalValue),
      successRate: total ? Number(((successful / total) * 100).toFixed(1)) : 0,
      inProgressFiles: numberOf(contractStats?.inProgress),
      growthRate: previousPeriodTotal
        ? Number(
            (
              ((currentMonthTotal - previousPeriodTotal) /
                previousPeriodTotal) *
              100
            ).toFixed(1),
          )
        : currentMonthTotal > 0
          ? 100
          : 0,
    };
  }

  async getTrends(timeframe: DashboardTimeframe) {
    const config = {
      '30d': { interval: "interval '30 days'", bucket: 'day' },
      '6m': { interval: "interval '6 months'", bucket: 'month' },
      '12m': { interval: "interval '12 months'", bucket: 'month' },
      year: { interval: "date_trunc('year', CURRENT_DATE)", bucket: 'month' },
    }[timeframe];
    const condition =
      timeframe === 'year'
        ? `contract.createdAt >= ${config.interval}`
        : `contract.createdAt >= CURRENT_DATE - ${config.interval}`;

    const rows = await this.contracts
      .createQueryBuilder('contract')
      .leftJoin('contract.auctionResults', 'result')
      .select(`date_trunc('${config.bucket}', contract.createdAt)`, 'period')
      .addSelect('COUNT(DISTINCT contract.id)', 'fileCount')
      .addSelect('COALESCE(SUM(result.winningPrice), 0)', 'auctionValue')
      .where(condition)
      .groupBy('period')
      .orderBy('period', 'ASC')
      .getRawMany<NumericRow>();

    return rows.map((row) => ({
      period: row.period,
      fileCount: numberOf(row.fileCount),
      auctionValue: numberOf(row.auctionValue),
    }));
  }

  async getAssetBreakdown() {
    const rows = await this.contractProperties
      .createQueryBuilder('link')
      .innerJoin('link.property', 'property')
      .innerJoin('link.contract', 'contract')
      .leftJoin('contract.auctionResults', 'result')
      .select('property.propertyType', 'assetType')
      .addSelect('COUNT(DISTINCT contract.id)', 'fileCount')
      .addSelect('COALESCE(SUM(result.winningPrice), 0)', 'totalValue')
      .groupBy('property.propertyType')
      .orderBy('COUNT(DISTINCT contract.id)', 'DESC')
      .getRawMany<NumericRow>();

    return rows.map((row) => ({
      assetType: row.assetType,
      fileCount: numberOf(row.fileCount),
      totalValue: numberOf(row.totalValue),
    }));
  }

  getContractsOverTime() {
    return this.getTrends('12m');
  }

  async getRecentFiles() {
    const rows = await this.contracts.find({
      relations: { assignedTo: true, contractProperties: { property: true } },
      order: { createdAt: 'DESC' },
      take: 5,
    });
    return rows.map((contract) => ({
      id: contract.id,
      fileCode: contract.contractNumber,
      assetName:
        contract.contractProperties[0]?.property.propertyName ??
        contract.contractName,
      createdDate: contract.createdAt,
      status: contract.contractStatus,
      assignedOfficer: contract.assignedTo?.fullName ?? 'Chưa phân công',
    }));
  }

  async getLiquidatedFiles() {
    const rows = await this.contracts.find({
      where: { contractStatus: ContractStatus.DA_THANH_LY },
      relations: { assignedTo: true, auctionResults: true },
      order: { updatedAt: 'DESC' },
      take: 5,
    });
    return rows.map((contract) => {
      const latestResult = [...contract.auctionResults].sort(
        (a, b) => b.completedAt.getTime() - a.completedAt.getTime(),
      )[0];
      return {
        id: contract.id,
        fileCode: contract.contractNumber,
        startingPrice: numberOf(contract.startingPrice),
        winningPrice: numberOf(latestResult?.winningPrice),
        auctioneer: contract.assignedTo?.fullName ?? 'Chưa phân công',
        liquidationDate: latestResult?.completedAt ?? contract.updatedAt,
      };
    });
  }

  async getTopOfficers() {
    const rows = await this.users
      .createQueryBuilder('officer')
      .innerJoin('officer.assignedContracts', 'contract')
      .leftJoin('contract.auctionResults', 'result')
      .select('officer.id', 'id')
      .addSelect('officer.fullName', 'officerName')
      .addSelect('COUNT(DISTINCT contract.id)', 'handledFiles')
      .addSelect('COALESCE(SUM(result.winningPrice), 0)', 'totalValue')
      .addSelect(
        `COUNT(DISTINCT contract.id) FILTER (WHERE contract.contractStatus IN (:...completed))`,
        'completedFiles',
      )
      .setParameter('completed', [
        ContractStatus.DAU_GIA_THANH,
        ContractStatus.DA_THANH_LY,
      ])
      .groupBy('officer.id')
      .addGroupBy('officer.fullName')
      .orderBy('COUNT(DISTINCT contract.id)', 'DESC')
      .addOrderBy('COALESCE(SUM(result.winningPrice), 0)', 'DESC')
      .limit(5)
      .getRawMany<NumericRow>();

    return rows.map((row) => ({
      id: numberOf(row.id),
      officerName: row.officerName,
      handledFiles: numberOf(row.handledFiles),
      totalValue: numberOf(row.totalValue),
      completionRate: numberOf(row.handledFiles)
        ? Number(
            (
              (numberOf(row.completedFiles) / numberOf(row.handledFiles)) *
              100
            ).toFixed(1),
          )
        : 0,
    }));
  }
}
