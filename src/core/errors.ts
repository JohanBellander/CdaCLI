/**
 * Error codes used throughout the CDA CLI application.
 * All errors map to exit code 1.
 */
export type ErrorCode = "FATAL" | "CONFIG_ERROR" | "BUNDLE_ERROR" | "IO_ERROR";

/**
 * Custom error class for CDA-specific errors with categorized error codes.
 */
export class CdaError extends Error {
  public readonly code: ErrorCode;
  public readonly exitCode: number;

  /**
   * Creates a new CDA error.
   * @param code - The error category
   * @param message - Human-readable error description
   * @param options - Optional error options including the underlying cause
   */
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

/**
 * Mapping of error codes to exit codes.
 * Currently all errors map to exit code 1.
 */
export const ERROR_EXIT_CODES: Record<ErrorCode, number> = {
  FATAL: 1,
  CONFIG_ERROR: 1,
  BUNDLE_ERROR: 1,
  IO_ERROR: 1,
};

/**
 * Factory function to create a CdaError.
 * @param code - The error category
 * @param message - Human-readable error description
 * @param options - Optional error options including the underlying cause
 * @returns A new CdaError instance
 */
export function createError(
  code: ErrorCode,
  message: string,
  options?: { cause?: Error },
): CdaError {
  return new CdaError(code, message, options);
}

/**
 * Type guard to check if an error is a CdaError.
 * @param error - The error to check
 * @returns True if the error is a CdaError
 */
export function isCdaError(error: unknown): error is CdaError {
  return error instanceof CdaError;
}

/**
 * Extracts the exit code from an error.
 * @param error - The error to extract the exit code from
 * @returns The exit code (defaults to 1 for non-CdaError errors)
 */
export function getExitCode(error: unknown): number {
  if (isCdaError(error)) {
    return error.exitCode;
  }
  return 1;
}
