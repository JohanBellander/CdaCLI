import type { ConstraintDocument } from "./constraintLoader.js";
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
    enabledConstraints?: ConstraintDocument[];
}
export interface PromptAssemblyResult {
    prompt: string;
    /**
     * Character count used for heuristic token calculations (excludes the metrics lines themselves).
     */
    charCount: number;
    approxTokenLength: number;
}
/**
 * Generate a formatted quick tips section from enabled constraints that define quick_tip copy.
 */
export declare function buildQuickTipsSection(enabledConstraints: ConstraintDocument[]): string;
export declare function assemblePrompt(options: PromptAssemblerOptions): PromptAssemblyResult;
