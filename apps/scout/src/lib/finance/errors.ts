export class FinanceValidationError extends Error {
  status = 400;
  issues: { field: string; message: string }[];

  constructor(message: string, issues?: { field: string; message: string }[]) {
    super(message);
    this.name = 'FinanceValidationError';
    this.issues = issues?.length ? issues : [{ field: '_', message }];
  }
}

export class FinanceConflictError extends Error {
  status = 409;
  constructor(message: string) {
    super(message);
    this.name = 'FinanceConflictError';
  }
}

export class FinanceNotFoundError extends Error {
  status = 404;
  constructor(message = 'Record not found') {
    super(message);
    this.name = 'FinanceNotFoundError';
  }
}

export class FinanceForbiddenError extends Error {
  status = 403;
  constructor(message = 'Access denied') {
    super(message);
    this.name = 'FinanceForbiddenError';
  }
}

export function isFinanceError(
  err: unknown
): err is FinanceValidationError | FinanceConflictError | FinanceNotFoundError | FinanceForbiddenError {
  return (
    err instanceof FinanceValidationError ||
    err instanceof FinanceConflictError ||
    err instanceof FinanceNotFoundError ||
    err instanceof FinanceForbiddenError
  );
}
