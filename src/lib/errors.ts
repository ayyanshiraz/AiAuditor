export class AppError extends Error {
  public readonly userMessage: string;
  public readonly status: number;
  public readonly code: string;

  constructor(userMessage: string, opts?: { status?: number; code?: string; cause?: unknown }) {
    super(userMessage);
    this.userMessage = userMessage;
    this.status = opts?.status ?? 400;
    this.code = opts?.code ?? "APP_ERROR";
    if (opts?.cause) this.cause = opts.cause;
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, { status: 422, code: "VALIDATION_ERROR" });
  }
}

export class UnbalancedEntryError extends AppError {
  constructor(debit: string, credit: string) {
    super(
      `Journal entry does not balance: total debits (${debit}) must equal total credits (${credit}).`,
      { status: 422, code: "UNBALANCED_ENTRY" }
    );
  }
}

export class PeriodClosedError extends AppError {
  constructor(periodName?: string) {
    super(
      `The accounting period${periodName ? ` "${periodName}"` : ""} is closed. Reopen it (with permission) before posting to this date.`,
      { status: 409, code: "PERIOD_CLOSED" }
    );
  }
}

export class NotFoundError extends AppError {
  constructor(entity: string) {
    super(`${entity} was not found.`, { status: 404, code: "NOT_FOUND" });
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "You do not have permission to perform this action.") {
    super(message, { status: 403, code: "FORBIDDEN" });
  }
}

export class ImmutableRecordError extends AppError {
  constructor() {
    super(
      "Posted accounting entries cannot be edited directly. Use a reversal or correcting entry instead.",
      { status: 409, code: "IMMUTABLE_RECORD" }
    );
  }
}

/** Converts any thrown error into a safe, user-facing message + logs the real one server-side. */
export function toSafeError(err: unknown): { message: string; status: number; code: string } {
  if (err instanceof AppError) {
    return { message: err.userMessage, status: err.status, code: err.code };
  }
  // eslint-disable-next-line no-console
  console.error("[unhandled-error]", err);
  return {
    message: "Something went wrong while processing your request. Please try again.",
    status: 500,
    code: "INTERNAL_ERROR",
  };
}
