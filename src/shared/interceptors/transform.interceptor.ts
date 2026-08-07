import {
  CallHandler,
  ExecutionContext,
  NestInterceptor,
  StreamableFile,
} from '@nestjs/common';
import type { Response as ExpressResponse } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

interface Response<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T | null;
}

export class TransformInterceptor<T> implements NestInterceptor<
  T,
  Response<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    const response = context
      .switchToHttp()
      .getResponse<ExpressResponse & { message?: string }>();

    return next.handle().pipe(
      map((data: T) => {
        // Nest must receive StreamableFile directly so it can pipe binary
        // responses instead of serializing them into the JSON envelope.
        if (data instanceof StreamableFile)
          return data as unknown as Response<T>;

        let message = response.message || 'Request successful';
        let responseData: T | null = data ?? null;

        if (
          data !== null &&
          typeof data === 'object' &&
          !Array.isArray(data) &&
          'message' in data &&
          typeof data.message === 'string'
        ) {
          message = data.message;
          const rest = {
            ...(data as Record<string, unknown>),
          };
          delete rest.message;
          responseData = (Object.keys(rest).length ? rest : null) as T | null;
        }

        const res: Response<T> = {
          success: true,
          statusCode: response.statusCode,
          message,
          data: responseData,
        };

        return res;
      }),
    );
  }
}
