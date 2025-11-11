/**
 * Options for generating a run ID.
 */
export interface RunIdOptions {
    /** Optional date to use for timestamp (defaults to current date/time) */
    now?: Date;
    /** Optional random number generator (defaults to Math.random) */
    random?: () => number;
}
/**
 * Generates a unique run ID combining ISO timestamp and random alphanumeric suffix.
 * Format: `YYYY-MM-DDTHH:mm:ss.sssZ-xxxxxx` where x is a random base-36 character.
 *
 * @param options - Configuration options for run ID generation
 * @returns A unique run ID string
 *
 * @example
 * ```typescript
 * const runId = generateRunId();
 * // Returns something like: "2025-01-15T10:30:45.123Z-abc123"
 * ```
 */
export declare function generateRunId(options?: RunIdOptions): string;
