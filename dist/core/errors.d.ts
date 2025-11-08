export type ErrorCode = "FATAL" | "CONFIG_ERROR" | "BUNDLE_ERROR" | "IO_ERROR";
export declare class CdaError extends Error {
    readonly code: ErrorCode;
    readonly exitCode: number;
    constructor(code: ErrorCode, message: string, options?: {
        cause?: Error;
    });
}
export declare const ERROR_EXIT_CODES: Record<ErrorCode, number>;
export declare function createError(code: ErrorCode, message: string, options?: {
    cause?: Error;
}): CdaError;
export declare function isCdaError(error: unknown): error is CdaError;
export declare function getExitCode(error: unknown): number;
