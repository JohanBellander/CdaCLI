export interface RunIdOptions {
    now?: Date;
    random?: () => number;
}
export declare function generateRunId(options?: RunIdOptions): string;
