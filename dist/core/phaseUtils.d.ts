import type { ConstraintDocument } from "./constraintLoader.js";
import { type ConstraintMeta, type Phase } from "./types.js";
export interface PhaseMetadata {
    phase_mode: Phase;
    phase_number: number;
    phase_label: string;
    included_phases: Phase[];
    constraints_in_phase: number;
    cumulative_constraints: number;
    next_phase?: Phase;
}
export interface PhasePromptContext {
    metadata: PhaseMetadata;
    phaseActiveCount: number;
    cumulativeActiveCount: number;
    objectiveLines: string[];
    validationLines: string[];
    contextLines: string[];
    keyPrinciples: string[];
    nextSteps: string[];
}
export interface PhaseInfo {
    phase: Phase;
    phaseNumber: number;
    includedPhases: Phase[];
    nextPhase?: Phase;
    phaseDefinedCount: number;
    phaseActiveCount: number;
    cumulativeDefinedCount: number;
    cumulativeActiveCount: number;
}
export interface PhaseFilterInput {
    phase: Phase;
    activeConstraints: ConstraintDocument[];
    disabledConstraints: ConstraintDocument[];
    allConstraints: ConstraintDocument[];
}
export interface PhaseFilterResult {
    constraints: ConstraintDocument[];
    info: PhaseInfo;
    disabledConstraintIds: string[];
    missingConstraintIds: string[];
}
export declare function assertValidPhase(phaseName: string): Phase;
export declare function getPhaseIndex(phase: Phase): number;
export declare function getPhaseConstraintIds(phase: Phase): string[];
export declare function getConstraintsForPhase(phase: Phase, allConstraints: ConstraintMeta[]): ConstraintMeta[];
export declare function filterConstraintsByPhase(input: PhaseFilterInput): PhaseFilterResult;
export declare function buildPhasePromptContext(info: PhaseInfo): PhasePromptContext;
export declare function formatPhaseWarnings(result: PhaseFilterResult): string[];
