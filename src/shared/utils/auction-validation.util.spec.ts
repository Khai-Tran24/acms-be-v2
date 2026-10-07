import {
  contractAuctionTerms,
  validateAuctionResult,
  validateRegulation,
} from './auction-validation.util';
import type { Contract } from '../../contract/entities/contract.entity';

const terms = {
  startingPrice: '100',
  depositAmount: '20',
  startRegisterDate: '2026-10-01T00:00:00+07:00',
  endRegisterDate: '2026-10-10T00:00:00+07:00',
  auctionDate: '2026-10-11T09:00:00+07:00',
};

describe('Auction validation boundaries', () => {
  it('accepts ordered regulation dates and a smaller deposit', () => {
    expect(() => validateRegulation(terms)).not.toThrow();
  });
  it.each([
    { endRegisterDate: terms.startRegisterDate },
    { endRegisterDate: '2026-09-30T00:00:00+07:00' },
    { auctionDate: terms.endRegisterDate },
    { auctionDate: terms.startRegisterDate },
    { depositAmount: '100' },
    { depositAmount: '101' },
    { depositAmount: '-1' },
    { startRegisterDate: null },
    { depositAmount: null },
  ])('rejects invalid regulation relation %j', (change) => {
    expect(() => validateRegulation({ ...terms, ...change })).toThrow();
  });
  it('allows winning price equal to starting price, requires completion strictly after auction', () => {
    expect(() =>
      validateAuctionResult(
        { winningPrice: 100, completedAt: '2026-10-11T09:01:00+07:00' },
        terms,
      ),
    ).not.toThrow();
    expect(() =>
      validateAuctionResult(
        { winningPrice: 99, completedAt: '2026-10-12' },
        terms,
      ),
    ).toThrow('Giá trúng');
    expect(() =>
      validateAuctionResult(
        { winningPrice: 100, completedAt: terms.auctionDate },
        terms,
      ),
    ).toThrow('Thời gian');
    expect(() =>
      validateAuctionResult(
        { winningPrice: 100, completedAt: '2026-10-12' },
        { startingPrice: 100 },
      ),
    ).toThrow('chưa có ngày');
  });
  it('selects the newest records by ID regardless of list order, with announcement precedence', () => {
    const contract = {
      startingPrice: '50',
      regulations: [
        { id: 8, startingPrice: '100' },
        { id: 2, startingPrice: '60' },
      ],
      announcements: [
        { id: 3, startingPrice: '120' },
        { id: 1, startingPrice: '80' },
      ],
    } as Contract;
    expect(contractAuctionTerms(contract).startingPrice).toBe('120');
    expect(
      contractAuctionTerms({ ...contract, announcements: [] }).startingPrice,
    ).toBe('100');
  });
});
