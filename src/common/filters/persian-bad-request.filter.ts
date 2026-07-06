import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
} from '@nestjs/common';
import type { Response } from 'express';

@Catch(BadRequestException)
export class PersianBadRequestFilter implements ExceptionFilter {
  catch(exception: BadRequestException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const statusCode = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    if (this.isNumericStringValidationError(exceptionResponse)) {
      return response.status(statusCode).json({
        message: 'شناسه باید عددی باشد',
        error: 'Bad Request',
        statusCode,
      });
    }

    if (typeof exceptionResponse === 'string') {
      return response.status(statusCode).json({
        message: exceptionResponse,
        error: 'Bad Request',
        statusCode,
      });
    }

    return response.status(statusCode).json(exceptionResponse);
  }

  private isNumericStringValidationError(exceptionResponse: unknown) {
    if (typeof exceptionResponse === 'string') {
      return exceptionResponse.includes(
        'Validation failed (numeric string is expected)',
      );
    }

    if (
      typeof exceptionResponse === 'object' &&
      exceptionResponse !== null
    ) {
      const responseObject = exceptionResponse as {
        message?: string | string[];
      };

      if (Array.isArray(responseObject.message)) {
        return responseObject.message.some((message) =>
          String(message).includes(
            'Validation failed (numeric string is expected)',
          ),
        );
      }

      return String(responseObject.message || '').includes(
        'Validation failed (numeric string is expected)',
      );
    }

    return false;
  }
}
