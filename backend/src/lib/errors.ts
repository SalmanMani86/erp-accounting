export class AppError extends Error {
  constructor(public readonly statusCode: number, public readonly code: string, message: string) {
    super(message);
    this.name = "AppError";
  }
}

export class NotFoundError extends AppError {
  constructor(entity: string) {
    super(404, "NOT_FOUND", `${entity} not found`);
  }
}

export class ValidationFailedError extends AppError {
  constructor(message: string) {
    super(400, "VALIDATION_FAILED", message);
  }
}

export class PeriodClosedError extends AppError {
  constructor(periodName: string) {
    super(409, "PERIOD_CLOSED", `Fiscal period "${periodName}" is closed and cannot accept new postings`);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, "CONFLICT", message);
  }
}

export class InvalidStateError extends AppError {
  constructor(message: string) {
    super(422, "INVALID_STATE", message);
  }
}
