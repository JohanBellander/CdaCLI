import type { PhasePromptContext } from "./phaseUtils.js";
export interface PromptAssemblerOptions {
    runId: string;
    instructionFormatVersion?: number;
    generatedAt?: Date;
    agentName: string;
    agentModel?: string;
    instructionText: string;
    promptPreamble?: string;
    postscript?: string;
    legacyFormat?: boolean;
    disabledConstraints?: string[];
    phaseContext?: PhasePromptContext;
}
export interface PromptAssemblyResult {
    prompt: string;
    /**
     * Character count used for heuristic token calculations (excludes the metrics lines themselves).
     */
    charCount: number;
    approxTokenLength: number;
}
export declare function assemblePrompt(options: PromptAssemblerOptions): PromptAssemblyResult;
