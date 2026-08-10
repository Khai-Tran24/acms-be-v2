import { compareWithSha256, hashWithSha256 } from './crypto.util';

describe('crypto utilities', () => {
  it('hashes values with SHA-256 and safely compares them', () => {
    const hash = hashWithSha256('value');

    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(compareWithSha256('value', hash)).toBe(true);
    expect(compareWithSha256('another-value', hash)).toBe(false);
  });
});
