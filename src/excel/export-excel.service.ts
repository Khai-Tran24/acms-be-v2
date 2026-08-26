import { Injectable } from '@nestjs/common';
import { Workbook, Worksheet } from 'exceljs';
import { ContractService } from '../contract/contract.service';
import { QueryContractDto } from '../contract/dto/query-contract.dto';
import { Contract } from '../contract/entities/contract.entity';

export enum ContractExportColumn {
  ID = 'id',
  CONTRACT_NUMBER = 'contractNumber',
  CONTRACT_DATE = 'contractDate',
  CONTRACT_NAME = 'contractName',
  CONTRACT_TYPE = 'contractType',
  CONTRACT_OWNER_TYPE = 'contractOwnerType',
  REGULATION_NUMBER = 'regulationNumber',
  ANNOUNCEMENT_NUMBER = 'announcementNumber',
  START_REGISTER_DATE = 'startRegisterDate',
  END_REGISTER_DATE = 'endRegisterDate',
  AUCTION_DATE = 'auctionDate',
  AUCTION_TIME = 'auctionTime',
  CUSTOMER = 'customer',
  PROPERTY_NAME = 'propertyName',
  PROPERTY_TYPE = 'propertyType',
  ASSIGNED_TO = 'assignedTo',
  STARTING_PRICE = 'startingPrice',
  DEPOSIT_AMOUNT = 'depositAmount',
  STEP_PRICE = 'stepPrice',
  REGISTRATION_FEE = 'registrationFee',
  STATUS = 'status',
  CREATED_BY = 'createdBy',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
}

interface ExportColumn {
  header: string;
  key: ContractExportColumn;
  width: number;
  value: (contract: Contract) => string | number | Date | null;
  numFmt?: string;
}

@Injectable()
export class ExportExcelService {
  constructor(private readonly contractService: ContractService) {}

  async exportContracts(query: QueryContractDto): Promise<Buffer> {
    const contracts = await this.contractService.findAllForExport(query);
    const workbook = new Workbook();
    workbook.creator = 'Auction Contract Management';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Hợp đồng', {
      views: [{ state: 'frozen', ySplit: 1 }],
    });
    const columns = this.contractColumns();
    worksheet.columns = columns.map(({ header, key, width }) => ({
      header,
      key,
      width,
    }));

    for (const contract of contracts) {
      worksheet.addRow(
        Object.fromEntries(
          columns.map((column) => [column.key, column.value(contract)]),
        ),
      );
    }

    this.styleWorksheet(
      worksheet,
      columns.map(({ numFmt }) => numFmt),
    );
    this.addRelationWorksheets(workbook, contracts);

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  private styleWorksheet(
    worksheet: Worksheet,
    numberFormats: Array<string | undefined> = [],
  ) {
    const header = worksheet.getRow(1);
    header.height = 24;
    header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    header.alignment = { vertical: 'middle', horizontal: 'center' };
    header.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1F4E78' },
    };
    header.eachCell((cell) => {
      cell.border = {
        bottom: { style: 'thin', color: { argb: 'FFFFFFFF' } },
      };
    });

    numberFormats.forEach((numFmt, index) => {
      if (numFmt) worksheet.getColumn(index + 1).numFmt = numFmt;
      worksheet.getColumn(index + 1).alignment = {
        vertical: 'top',
        wrapText: true,
      };
    });
    worksheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: worksheet.columnCount },
    };
  }

  private contractColumns(): ExportColumn[] {
    return [
      {
        header: 'ID',
        key: ContractExportColumn.ID,
        width: 12,
        value: (c) => c.id,
      },
      {
        header: 'Số hợp đồng',
        key: ContractExportColumn.CONTRACT_NUMBER,
        width: 20,
        value: (c) => c.contractNumber,
      },
      {
        header: 'Ngày ký kết hợp đồng',
        key: ContractExportColumn.CONTRACT_DATE,
        width: 22,
        value: (c) => this.toDate(c.contractDate),
        numFmt: 'dd/mm/yyyy',
      },
      {
        header: 'Tên hợp đồng',
        key: ContractExportColumn.CONTRACT_NAME,
        width: 35,
        value: (c) => c.contractName,
      },
      {
        header: 'Loại hợp đồng',
        key: ContractExportColumn.CONTRACT_TYPE,
        width: 28,
        value: (c) => c.contractType,
      },
      {
        header: 'Loại chủ sở hữu tài sản',
        key: ContractExportColumn.CONTRACT_OWNER_TYPE,
        width: 35,
        value: (c) => c.contractOwnerType,
      },
      {
        header: 'Số quy chế',
        key: ContractExportColumn.REGULATION_NUMBER,
        width: 20,
        value: (c) =>
          c.regulations?.map((r) => r.regulationNumber).join('\n') ?? '',
      },
      {
        header: 'Số thông báo',
        key: ContractExportColumn.ANNOUNCEMENT_NUMBER,
        width: 20,
        value: (c) =>
          c.announcements?.map((a) => a.announcementNumber).join('\n') ?? '',
      },
      {
        header: 'Ngày bắt đầu đăng ký',
        key: ContractExportColumn.START_REGISTER_DATE,
        width: 22,
        value: (c) =>
          c.regulations
            ?.map((r) => this.formatDateTime(r.startRegisterDate))
            .join('\n') ?? '',
      },
      {
        header: 'Ngày kết thúc đăng ký',
        key: ContractExportColumn.END_REGISTER_DATE,
        width: 22,
        value: (c) =>
          c.regulations
            ?.map((r) => this.formatDateTime(r.endRegisterDate))
            .join('\n') ?? '',
      },
      {
        header: 'Ngày đấu giá',
        key: ContractExportColumn.AUCTION_DATE,
        width: 22,
        value: (c) =>
          c.regulations
            ?.map((r) => this.formatDateTime(r.auctionDate))
            .join('\n') ?? '',
      },
      {
        header: 'Thời gian đấu giá (phút)',
        key: ContractExportColumn.AUCTION_TIME,
        width: 20,
        value: (c) => c.regulations?.map((r) => r.auctionTime).join('\n') ?? '',
      },
      {
        header: 'Khách hàng',
        key: ContractExportColumn.CUSTOMER,
        width: 30,
        value: (c) => this.formatObject(c.customer),
      },
      {
        header: 'Tên tài sản',
        key: ContractExportColumn.PROPERTY_NAME,
        width: 35,
        value: (c) =>
          c.contractProperties
            ?.map((item) => item.property.propertyName)
            .join('\n') ?? '',
      },
      {
        header: 'Loại tài sản',
        key: ContractExportColumn.PROPERTY_TYPE,
        width: 25,
        value: (c) =>
          c.contractProperties
            ?.map((item) => item.property.propertyType)
            .join('\n') ?? '',
      },
      {
        header: 'Người thụ lý',
        key: ContractExportColumn.ASSIGNED_TO,
        width: 25,
        value: (c) => c.assignedTo?.fullName || c.assignedTo?.username || '',
      },
      {
        header: 'Giá khởi điểm',
        key: ContractExportColumn.STARTING_PRICE,
        width: 20,
        value: (c) => Number(c.startingPrice),
        numFmt: '#,##0',
      },
      {
        header: 'Tiền đặt trước',
        key: ContractExportColumn.DEPOSIT_AMOUNT,
        width: 20,
        value: (c) =>
          c.regulations
            ?.map((r) => this.formatMoney(r.depositAmount))
            .join('\n') ?? '',
      },
      {
        header: 'Phí đăng ký',
        key: ContractExportColumn.REGISTRATION_FEE,
        width: 20,
        value: (c) =>
          c.regulations
            ?.map((r) => this.formatMoney(r.registrationFee))
            .join('\n') ?? '',
      },
      {
        header: 'Bước giá',
        key: ContractExportColumn.STEP_PRICE,
        width: 20,
        value: (c) => Number(c.stepPrice),
        numFmt: '#,##0',
      },
      {
        header: 'Trạng thái',
        key: ContractExportColumn.STATUS,
        width: 24,
        value: (c) => c.contractStatus,
      },
      {
        header: 'Người tạo',
        key: ContractExportColumn.CREATED_BY,
        width: 25,
        value: (c) => c.createdBy?.fullName || c.createdBy?.username || '',
      },
      {
        header: 'Ngày tạo',
        key: ContractExportColumn.CREATED_AT,
        width: 22,
        value: (c) => this.toDate(c.createdAt),
        numFmt: 'hh:mm dd/mm/yyyy',
      },
      {
        header: 'Ngày cập nhật',
        key: ContractExportColumn.UPDATED_AT,
        width: 22,
        value: (c) => this.toDate(c.updatedAt),
        numFmt: 'hh:mm dd/mm/yyyy',
      },
    ];
  }

  private toDate(value: Date | string | null | undefined): Date | null {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private formatDateTime(value: Date | string | null | undefined): string {
    const date = this.toDate(value);
    if (!date) return '';
    return new Intl.DateTimeFormat('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour12: false,
    }).format(date);
  }

  private formatMoney(value: string | number | null | undefined): string {
    if (value === null || value === undefined || value === '') return '';
    const amount = Number(value);
    return Number.isFinite(amount)
      ? new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(
          amount,
        )
      : '';
  }

  private addRelationWorksheets(workbook: Workbook, contracts: Contract[]) {
    this.addDataWorksheet(
      workbook,
      'Tài sản',
      [
        { header: 'ID hợp đồng', key: 'contractId', width: 14 },
        { header: 'Số hợp đồng', key: 'contractNumber', width: 20 },
        { header: 'ID tài sản', key: 'propertyId', width: 14 },
        { header: 'Tên tài sản', key: 'propertyName', width: 35 },
        { header: 'Loại tài sản', key: 'propertyType', width: 25 },
        { header: 'Địa điểm tài sản', key: 'propertyLocation', width: 40 },
      ],
      contracts.flatMap((contract) =>
        (contract.contractProperties ?? []).map(({ property }) => ({
          contractId: contract.id,
          contractNumber: contract.contractNumber,
          propertyId: property.id,
          propertyName: property.propertyName,
          propertyType: property.propertyType,
          propertyLocation: property.propertyLocation,
        })),
      ),
    );

    this.addDataWorksheet(
      workbook,
      'Quy chế',
      [
        { header: 'ID hợp đồng', key: 'contractId', width: 14 },
        { header: 'Số hợp đồng', key: 'contractNumber', width: 20 },
        { header: 'ID quy chế', key: 'regulationId', width: 14 },
        { header: 'Số quy chế', key: 'regulationNumber', width: 20 },
        { header: 'Giá khởi điểm', key: 'startingPrice', width: 20 },
        { header: 'Tiền đặt trước', key: 'depositAmount', width: 20 },
        { header: 'Bước giá', key: 'stepPrice', width: 20 },
        { header: 'Phí đăng ký', key: 'registrationFee', width: 20 },
        { header: 'Bắt đầu đăng ký', key: 'startRegisterDate', width: 22 },
        { header: 'Kết thúc đăng ký', key: 'endRegisterDate', width: 22 },
        { header: 'Ngày đấu giá', key: 'auctionDate', width: 22 },
        { header: 'Thời gian (phút)', key: 'auctionTime', width: 18 },
        { header: 'Hình thức', key: 'auctionFormat', width: 25 },
        { header: 'Phương thức', key: 'auctionMethod', width: 25 },
      ],
      contracts.flatMap((contract) =>
        (contract.regulations ?? []).map((regulation) => ({
          contractId: contract.id,
          contractNumber: contract.contractNumber,
          regulationId: regulation.id,
          regulationNumber: regulation.regulationNumber,
          startingPrice: Number(regulation.startingPrice),
          depositAmount: Number(regulation.depositAmount),
          stepPrice: Number(regulation.stepPrice),
          registrationFee: Number(regulation.registrationFee),
          startRegisterDate: this.toDate(regulation.startRegisterDate),
          endRegisterDate: this.toDate(regulation.endRegisterDate),
          auctionDate: this.toDate(regulation.auctionDate),
          auctionTime: regulation.auctionTime,
          auctionFormat: regulation.auctionFormat,
          auctionMethod: regulation.auctionMethod,
        })),
      ),
      {
        5: '#,##0.00',
        6: '#,##0.00',
        7: '#,##0.00',
        8: '#,##0.00',
        9: 'hh:mm dd/mm/yyyy',
        10: 'hh:mm dd/mm/yyyy',
        11: 'hh:mm dd/mm/yyyy',
      },
    );

    this.addDataWorksheet(
      workbook,
      'Thông báo',
      [
        { header: 'ID hợp đồng', key: 'contractId', width: 14 },
        { header: 'Số hợp đồng', key: 'contractNumber', width: 20 },
        { header: 'ID thông báo', key: 'announcementId', width: 14 },
        { header: 'Số thông báo', key: 'announcementNumber', width: 20 },
        { header: 'Giá khởi điểm', key: 'startingPrice', width: 20 },
        { header: 'Tiền đặt trước', key: 'depositAmount', width: 20 },
        { header: 'Bước giá', key: 'stepPrice', width: 20 },
        { header: 'Phí đăng ký', key: 'registrationFee', width: 20 },
        { header: 'Bắt đầu đăng ký', key: 'startRegisterDate', width: 22 },
        { header: 'Kết thúc đăng ký', key: 'endRegisterDate', width: 22 },
        { header: 'Ngày đấu giá', key: 'auctionDate', width: 22 },
        { header: 'Thời gian (phút)', key: 'auctionTime', width: 18 },
        { header: 'Hình thức', key: 'auctionFormat', width: 25 },
        { header: 'Phương thức', key: 'auctionMethod', width: 25 },
      ],
      contracts.flatMap((contract) =>
        (contract.announcements ?? []).map((announcement) => ({
          contractId: contract.id,
          contractNumber: contract.contractNumber,
          announcementId: announcement.id,
          announcementNumber: announcement.announcementNumber,
          startingPrice: Number(announcement.startingPrice),
          depositAmount: Number(announcement.depositAmount),
          stepPrice: Number(announcement.stepPrice),
          registrationFee: Number(announcement.registrationFee),
          startRegisterDate: this.toDate(announcement.startRegisterDate),
          endRegisterDate: this.toDate(announcement.endRegisterDate),
          auctionDate: this.toDate(announcement.auctionDate),
          auctionTime: announcement.auctionTime,
          auctionFormat: announcement.auctionFormat,
          auctionMethod: announcement.auctionMethod,
        })),
      ),
      {
        5: '#,##0.00',
        6: '#,##0.00',
        7: '#,##0.00',
        8: '#,##0.00',
        9: 'hh:mm dd/mm/yyyy',
        10: 'hh:mm dd/mm/yyyy',
        11: 'hh:mm dd/mm/yyyy',
      },
    );

    this.addDataWorksheet(
      workbook,
      'Kết quả đấu giá',
      [
        { header: 'ID hợp đồng', key: 'contractId', width: 14 },
        { header: 'Số hợp đồng', key: 'contractNumber', width: 20 },
        { header: 'ID kết quả', key: 'resultId', width: 14 },
        { header: 'Số kết quả', key: 'resultNumber', width: 20 },
        { header: 'Người trúng', key: 'winner', width: 30 },
        { header: 'Giá trúng', key: 'winningPrice', width: 20 },
        { header: 'Ngày hoàn thành', key: 'completedAt', width: 22 },
      ],
      contracts.flatMap((contract) =>
        (contract.auctionResults ?? []).map((result) => ({
          contractId: contract.id,
          contractNumber: contract.contractNumber,
          resultId: result.id,
          resultNumber: result.auctionResultNumber,
          winner: this.formatObject(result.winner),
          winningPrice: Number(result.winningPrice),
          completedAt: this.toDate(result.completedAt),
        })),
      ),
      { 6: '#,##0.00', 7: 'hh:mm dd/mm/yyyy' },
    );
  }

  private addDataWorksheet(
    workbook: Workbook,
    name: string,
    columns: Array<{ header: string; key: string; width: number }>,
    rows: Array<Record<string, unknown>>,
    numberFormats: Record<number, string> = {},
  ) {
    const worksheet = workbook.addWorksheet(name, {
      views: [{ state: 'frozen', ySplit: 1 }],
    });
    worksheet.columns = columns;
    worksheet.addRows(rows);
    const formats = columns.map((_, index) => numberFormats[index + 1]);
    this.styleWorksheet(worksheet, formats);
  }

  private formatObject(value: Record<string, unknown> | null): string {
    if (!value) return '';
    const preferred = ['fullName', 'name', 'organizationName', 'phone', 'email']
      .map((key) => value[key])
      .filter((item): item is string | number =>
        ['string', 'number'].includes(typeof item),
      );
    return preferred.length ? preferred.join(' - ') : JSON.stringify(value);
  }
}
