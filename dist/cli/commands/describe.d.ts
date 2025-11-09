interface DescribeCommandOptions {
    cwd?: string;
    constraintsDir?: string;
}
export declare function runDescribeCommand(args?: string[], options?: DescribeCommandOptions): Promise<void>;
export {};
