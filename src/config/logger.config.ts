import { Params } from 'nestjs-pino';

export const loggerConfig: Params = {
  pinoHttp: {
    level: 'debug',
    transport: {
      target: 'pino-pretty',
      options: { sync: true, singleLine: true },
    },
  },
};
