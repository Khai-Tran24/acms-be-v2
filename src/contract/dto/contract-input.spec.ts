import { ValidationPipe } from '@nestjs/common';
import { QueryContractDto } from './query-contract.dto';
import { CreateContractDto } from './create-contract.dto';
import { UpdateContractDto } from './update-contract.dto';
import { CreateRegulationDto } from '../../regulation/dto/create-regulation.dto';
import { CreateAnnouncementDto } from '../../announcement/dto/create-announcement.dto';
import { UpdateRegulationDto } from '../../regulation/dto/update-regulation.dto';
import { UpdateAnnouncementDto } from '../../announcement/dto/update-announcement.dto';
import {
  AuctionFormat,
  AuctionMethod,
  ContractStatus,
} from '../../shared/enums/contract.enum';

const pipe = new ValidationPipe({
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
});
const contract = {
  startingPrice: 100,
  stepPrice: 10,
  contractStatus: ContractStatus.MOI,
};
const auction = {
  contractId: 1,
  startingPrice: 100,
  depositAmount: 20,
  stepPrice: 10,
  registrationFee: 5,
  startRegisterDate: '2026-10-01',
  endRegisterDate: '2026-10-02',
  auctionDate: '2026-10-03',
};

describe('Contract and auction input validation', () => {
  it('parses selectableOnly query flags and rejects invalid values', async () => {
    for (const [value, expected] of [['true', true], ['false', false], [true, true], [false, false]]) {
      await expect(pipe.transform({ selectableOnly: value }, {
        type: 'query', metatype: QueryContractDto,
      })).resolves.toMatchObject({ selectableOnly: expected });
    }
    await expect(pipe.transform({ selectableOnly: 'invalid' }, {
      type: 'query', metatype: QueryContractDto,
    })).rejects.toThrow();
  });

  it('accepts optional numbers and parents but rejects caller-supplied contract types', async () => {
    await expect(
      pipe.transform(contract, { type: 'body', metatype: CreateContractDto }),
    ).resolves.toMatchObject(contract);
    await expect(
      pipe.transform(
        { ...contract, parentContractId: '12', contractNumber: null },
        { type: 'body', metatype: CreateContractDto },
      ),
    ).resolves.toMatchObject({ parentContractId: 12 });
    await expect(
      pipe.transform(
        { ...contract, contractType: 'HOP_DONG_MOI' },
        { type: 'body', metatype: CreateContractDto },
      ),
    ).rejects.toThrow();
    await expect(
      pipe.transform(
        { parentContractId: null, contractNumber: null },
        { type: 'body', metatype: UpdateContractDto },
      ),
    ).resolves.toMatchObject({ parentContractId: null });
  });

  it.each([0, -1, 'abc', 1.5])(
    'rejects invalid parent ID %s',
    async (parentContractId) => {
      await expect(
        pipe.transform(
          { ...contract, parentContractId },
          { type: 'body', metatype: CreateContractDto },
        ),
      ).rejects.toThrow();
    },
  );

  it.each([CreateRegulationDto, CreateAnnouncementDto])(
    'validates enum values on %p',
    async (metatype) => {
      const value = {
        ...auction,
        ...(metatype === CreateRegulationDto
          ? { regulationNumber: 'QC' }
          : { announcementNumber: 'TB' }),
      };
      for (const auctionFormat of Object.values(AuctionFormat)) {
        for (const auctionMethod of Object.values(AuctionMethod)) {
          await expect(
            pipe.transform(
              { ...value, auctionFormat, auctionMethod },
              { type: 'body', metatype },
            ),
          ).resolves.toMatchObject({ auctionFormat, auctionMethod });
        }
      }
      await expect(
        pipe.transform(
          { ...value, auctionFormat: 'free text' },
          { type: 'body', metatype },
        ),
      ).rejects.toThrow();
      await expect(
        pipe.transform(
          { ...value, auctionMethod: 'free text' },
          { type: 'body', metatype },
        ),
      ).rejects.toThrow();
      await expect(
        pipe.transform(value, { type: 'body', metatype }),
      ).resolves.toMatchObject(value);
    },
  );

  it.each([UpdateRegulationDto, UpdateAnnouncementDto])(
    'validates and clears enums on %p',
    async (metatype) => {
      await expect(
        pipe.transform(
          { auctionFormat: 'free text' },
          { type: 'body', metatype },
        ),
      ).rejects.toThrow();
      await expect(
        pipe.transform(
          { auctionFormat: null, auctionMethod: null },
          { type: 'body', metatype },
        ),
      ).resolves.toMatchObject({ auctionFormat: null });
    },
  );
});
