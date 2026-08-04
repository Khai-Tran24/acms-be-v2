import { CallHandler, ExecutionContext } from '@nestjs/common';
import { of, firstValueFrom } from 'rxjs';
import { TransformInterceptor } from './transform.interceptor';

describe('TransformInterceptor', () => {
  const context = {
    switchToHttp: () => ({
      getResponse: () => ({ statusCode: 201 }),
    }),
  } as ExecutionContext;

  it('moves a service message to the top level without duplicating it in data', async () => {
    const next = {
      handle: () => of({ message: 'Email verified. You can now sign in.' }),
    } as CallHandler;

    await expect(
      firstValueFrom(new TransformInterceptor().intercept(context, next)),
    ).resolves.toEqual({
      success: true,
      statusCode: 201,
      message: 'Email verified. You can now sign in.',
      data: null,
    });
  });

  it('keeps non-message response fields in data', async () => {
    const next = {
      handle: () => of({ message: 'Created', id: 7 }),
    } as CallHandler;

    await expect(
      firstValueFrom(new TransformInterceptor().intercept(context, next)),
    ).resolves.toEqual({
      success: true,
      statusCode: 201,
      message: 'Created',
      data: { id: 7 },
    });
  });
});
