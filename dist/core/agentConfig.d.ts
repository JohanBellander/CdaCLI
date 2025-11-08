export declare const AGENT_CONFIG_FILENAME = "cda.agents.json";
export type AgentExecutionMode = "stdin" | "arg";
export interface AgentDefinition {
    name: string;
    command: string;
    args: string[];
    mode: AgentExecutionMode;
    promptArgFlag?: string;
    promptFileArg?: string;
    promptPreamble?: string;
    postscript?: string;
    maxLength?: number;
    agentModel?: string;
}
export interface AgentConfig {
    path: string;
    defaultAgent?: string;
    agents: Record<string, AgentDefinition>;
}
interface LoadAgentConfigOptions {
    cwd?: string;
    required?: boolean;
}
export declare function loadAgentConfig(options?: LoadAgentConfigOptions): Promise<AgentConfig | null>;
export declare function resolveAgent(config: AgentConfig, requestedAgent?: string): {
    agentName: string;
    definition: AgentDefinition;
};
export {};
