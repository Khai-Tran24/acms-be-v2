import * as bcrypt from 'bcrypt';

type BcryptPromiseApi = {
  hash(value: string, saltOrRounds: number): Promise<string>;
  compare(value: string, encrypted: string): Promise<boolean>;
};

const bcryptLib = bcrypt as unknown as BcryptPromiseApi;

export function hashWithBcrypt(value: string): Promise<string> {
  return bcryptLib.hash(value, 10);
}

export function compareWithBcrypt(
  value: string,
  hashedValue: string,
): Promise<boolean> {
  return bcryptLib.compare(value, hashedValue);
}
