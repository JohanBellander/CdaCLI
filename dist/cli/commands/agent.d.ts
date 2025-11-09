interface AgentCommandOptions {
    cwd?: string;
    constraintsDir?: string;
}
export declare function runAgentCommand(argv?: string[], options?: AgentCommandOptions): Promise<void>;
export {};
