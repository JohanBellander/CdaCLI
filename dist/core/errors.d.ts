/**
 * Error codes used throughout the CDA CLI application.
 * All errors map to exit code 1.
 */
export type ErrorCode = "FATAL" | "CONFIG_ERROR" | "BUNDLE_ERROR" | "IO_ERROR";
/**
 * Custom error class for CDA-specific errors with categorized error codes.
 */
export declare class CdaError extends Error {
    readonly code: ErrorCode;
    readonly exitCode: number;
    /**
     * Creates a new CDA error.
     * @param code - The error category
     * @param message - Human-readable error description
     * @param options - Optional error options including the underlying cause
     */
    constructor(code: ErrorCode, message: string, options?: {
        cause?: Error;
    });
}
/**
 * Mapping of error codes to exit codes.
 * Currently all errors map to exit code 1.
 */
export declare const ERROR_EXIT_CODES: Record<ErrorCode, number>;
/**
 * Factory function to create a CdaError.
 * @param code - The error category
 * @param message - Human-readable error description
 * @param options - Optional error options including the underlying cause
 * @returns A new CdaError instance
 */
export declare function createError(code: ErrorCode, message: string, options?: {
    cause?: Error;
}): CdaError;
/**
 * Type guard to check if an error is a CdaError.
 * @param error - The error to check
 * @returns True if the error is a CdaError
 */
export declare function isCdaError(error: unknown): error is CdaError;
/**
 * Extracts the exit code from an error.
 * @param error - The error to extract the exit code from
 * @returns The exit code (defaults to 1 for non-CdaError errors)
 */
export declare function getExitCode(error: unknown): number;
