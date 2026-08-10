import { compareWithBcrypt, hashWithBcrypt } from './bcrypt.util';

describe('bcrypt utilities', () => {
  beforeAll(() => {
    process.env.BCRYPT_SALT_ROUNDS = '4';
  });

  afterAll(() => {
    delete process.env.BCRYPT_SALT_ROUNDS;
  });

  it('hashes and compares sensitive values', async () => {
    const hash = await hashWithBcrypt('sensitive-value');

    expect(hash).not.toBe('sensitive-value');
    await expect(compareWithBcrypt('sensitive-value', hash)).resolves.toBe(
      true,
    );
    await expect(compareWithBcrypt('wrong-value', hash)).resolves.toBe(false);
  });
});
