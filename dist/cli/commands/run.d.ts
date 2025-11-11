interface RunCommandOptions {
    cwd?: string;
    constraintsDir?: string;
}
export declare function runRunCommand(args?: string[], options?: RunCommandOptions): Promise<void>;
export {};
