import { createHash, timingSafeEqual } from 'crypto';

export function hashWithSha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function compareWithSha256(value: string, hashedValue: string): boolean {
  const candidate = Buffer.from(hashWithSha256(value), 'hex');
  const stored = Buffer.from(hashedValue, 'hex');

  return (
    stored.length === candidate.length && timingSafeEqual(candidate, stored)
  );
}
