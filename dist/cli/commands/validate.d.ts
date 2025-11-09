interface ValidateCommandOptions {
    cwd?: string;
    constraintsDir?: string;
}
export declare function runValidateCommand(args?: string[], options?: ValidateCommandOptions): Promise<void>;
export {};
