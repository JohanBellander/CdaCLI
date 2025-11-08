interface AgentCommandOptions {
    cwd?: string;
}
export declare function runAgentCommand(argv?: string[], options?: AgentCommandOptions): Promise<void>;
export {};
