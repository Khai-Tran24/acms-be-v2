import { BadRequestException } from '@nestjs/common';
import type { Contract } from '../../contract/entities/contract.entity';

type DateValue = string | Date | null | undefined;
type MoneyValue = string | number | null | undefined;
export interface AuctionTerms {
  startingPrice?: MoneyValue;
  registrationFee?: MoneyValue;
  depositAmount?: MoneyValue;
  startRegisterDate?: DateValue;
  endRegisterDate?: DateValue;
  auctionDate?: DateValue;
}

// Keep the existing autofill precedence: latest announcement, latest regulation, contract.
export function contractAuctionTerms(
  contract: Pick<Contract, 'startingPrice' | 'regulations' | 'announcements'>,
): AuctionTerms {
  const latest = <T extends { id: number }>(items: T[] | undefined) =>
    items?.reduce<T | undefined>(
      (result, item) => (!result || item.id > result.id ? item : result),
      undefined,
    );
  return {
    startingPrice: contract.startingPrice,
    ...latest(contract.regulations),
    ...latest(contract.announcements),
  };
}
const time = (value: DateValue) =>
  value == null ? NaN : new Date(value).getTime();
const amount = (value: MoneyValue) => (value == null ? NaN : Number(value));

export function validateRegulation(values: AuctionTerms) {
  if (!(
    time(values.startRegisterDate) < time(values.endRegisterDate) &&
    time(values.endRegisterDate) < time(values.auctionDate)
  )) {
    throw new BadRequestException(
      'Ngày bắt đầu đăng ký phải trước ngày kết thúc đăng ký; ngày kết thúc đăng ký phải trước ngày đấu giá.',
    );
  }
  if (!(
    amount(values.depositAmount) >= 0 &&
    amount(values.depositAmount) < amount(values.startingPrice)
  )) {
    throw new BadRequestException('Tiền đặt trước phải nhỏ hơn giá khởi điểm.');
  }
}

export function validateAuctionResult(
  values: { winningPrice?: MoneyValue; completedAt?: DateValue },
  terms: AuctionTerms,
) {
  if (!(amount(values.winningPrice) >= amount(terms.startingPrice))) {
    throw new BadRequestException(
      'Giá trúng phải lớn hơn hoặc bằng giá khởi điểm.',
    );
  }
  if (!Number.isFinite(time(terms.auctionDate)))
    throw new BadRequestException(
      'Hợp đồng chưa có ngày đấu giá. Vui lòng bổ sung quy chế hoặc thông báo.',
    );
  if (!(time(values.completedAt) > time(terms.auctionDate))) {
    throw new BadRequestException('Thời gian hoàn tất phải sau ngày đấu giá.');
  }
}
