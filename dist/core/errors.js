export class CdaError extends Error {
    code;
    exitCode;
    constructor(code, message, options) {
        super(message);
        this.code = code;
        this.name = code;
        this.exitCode = ERROR_EXIT_CODES[code];
        if (options?.cause) {
            this.cause = options.cause;
        }
    }
}
export const ERROR_EXIT_CODES = {
    FATAL: 1,
    CONFIG_ERROR: 1,
    BUNDLE_ERROR: 1,
    IO_ERROR: 1,
};
export function createError(code, message, options) {
    return new CdaError(code, message, options);
}
export function isCdaError(error) {
    return error instanceof CdaError;
}
export function getExitCode(error) {
    if (isCdaError(error)) {
        return error.exitCode;
    }
    return 1;
}
