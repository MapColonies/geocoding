import httpStatus from 'http-status-codes';
import { HttpError } from '@map-colonies/error-express-handler';

export class MissingConfigError extends Error {
  public readonly name: string;

  public constructor(message: string) {
    super(message);
    this.name = 'MissingConfigError';
  }
}

export class BadRequestError extends Error implements HttpError {
  public readonly status = httpStatus.BAD_REQUEST;

  public constructor(message: string) {
    super(message);
  }
}

export class InternalServerError extends Error implements HttpError {
  public readonly status = httpStatus.INTERNAL_SERVER_ERROR;

  public constructor(message: string) {
    super(message);
  }
}

export class ServiceUnavailableError extends Error implements HttpError {
  public readonly status = httpStatus.SERVICE_UNAVAILABLE;

  public constructor(message: string) {
    super(message);
  }
}

export class NotFoundError extends Error implements HttpError {
  public readonly status = httpStatus.NOT_FOUND;

  public constructor(message: string) {
    super(message);
  }
}

export class NotImplementedError extends Error implements HttpError {
  public readonly status = httpStatus.NOT_IMPLEMENTED;

  public constructor(message: string) {
    super(message);
  }
}

export class TimeoutError extends Error {}
