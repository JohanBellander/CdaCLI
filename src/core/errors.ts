export type ErrorCode = "FATAL" | "CONFIG_ERROR" | "BUNDLE_ERROR" | "IO_ERROR";

export class CdaError extends Error {
  public readonly code: ErrorCode;
  public readonly exitCode: number;

  constructor(code: ErrorCode, message: string, options?: { cause?: Error }) {
    super(message);
    this.code = code;
    this.name = code;
    this.exitCode = ERROR_EXIT_CODES[code];
    if (options?.cause) {
      this.cause = options.cause;
    }
  }
}

export const ERROR_EXIT_CODES: Record<ErrorCode, number> = {
  FATAL: 1,
  CONFIG_ERROR: 1,
  BUNDLE_ERROR: 1,
  IO_ERROR: 1,
};

export function createError(
  code: ErrorCode,
  message: string,
  options?: { cause?: Error },
): CdaError {
  return new CdaError(code, message, options);
}

export function isCdaError(error: unknown): error is CdaError {
  return error instanceof CdaError;
}

export function getExitCode(error: unknown): number {
  if (isCdaError(error)) {
    return error.exitCode;
  }
  return 1;
}
