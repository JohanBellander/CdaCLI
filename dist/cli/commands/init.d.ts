interface InitCommandOptions {
    cwd?: string;
}
export declare const DEFAULT_AGENT_CONFIG: {
    default: string;
    agents: {
        copilot: {
            command: string;
            args: string[];
            mode: string;
            prompt_arg_flag: string;
            prompt_preamble: string;
            postscript: string;
            max_length: number;
            agent_model: string;
        };
        "copilot-stdin": {
            command: string;
            args: string[];
            mode: string;
            prompt_preamble: string;
            postscript: string;
            agent_model: string;
        };
        echo: {
            command: string;
            args: never[];
            mode: string;
            prompt_preamble: string;
            postscript: string;
        };
    };
};
export declare function runInitCommand(args?: string[], options?: InitCommandOptions): Promise<void>;
export declare function buildDefaultConfigPayload(constraintIds: string[]): string;
export {};
