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
/**
 * Generate concrete examples section from enabled constraints that define quick_example copy.
 */
export declare function buildPatternExamplesSection(enabledConstraints: ConstraintDocument[]): string;
/**
 * Generate architecture checklist from constraints that define checklist_item copy.
 */
export declare function buildArchitectureChecklist(enabledConstraints: ConstraintDocument[]): string;
/**
 * Provide static implementation order guidance to keep work flowing top-down.
 */
export declare function buildImplementationOrderSection(): string;
export declare function assemblePrompt(options: PromptAssemblerOptions): PromptAssemblyResult;
