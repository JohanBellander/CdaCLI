export declare const CONSTRAINT_GROUPS: readonly ["patterns", "architecture", "best-practices", "frameworks", "contracts"];
export type ConstraintGroup = (typeof CONSTRAINT_GROUPS)[number];
export interface ConstraintMeta {
    id: string;
    name: string;
    category: string;
    severity: "error";
    enabled: boolean;
    optional: boolean;
    isActive: boolean;
    version: number;
    enforcementOrder: number;
    group: ConstraintGroup;
}
export interface ConstraintOverrideConfig {
    enabled: boolean;
}
export type ConstraintOverrides = Record<string, ConstraintOverrideConfig>;
export interface InstructionConstraintBlock {
    constraintId: string;
    enforcementOrder: number;
    objective: string;
    detectionSteps: string[];
    reportFields: string[];
    passCriteria: string;
    fixStrategy: string;
    selfVerificationChecklist: string[];
}
export interface BatchReportTemplate {
    reportKind: string;
    runId: string;
    executionState: string;
    analysisPerformed: boolean;
    enumeratedFilesCount: number;
    constraintBlocksReceived: number;
    summary: {
        analyzedFiles: number;
        constraintsEvaluated: number;
        totalViolations: number;
    };
    violations: Array<Record<string, unknown>>;
    fixesApplied: string[];
    postFixStatus: {
        revalidated: boolean;
        remainingViolations: number;
    };
    initialViolationCount: number;
    remainingViolationCount: number;
    revalidationAttemptsUsed: number;
    successConditions: {
        allConstraintsEvaluated: boolean;
        noRemainingViolations: boolean;
    };
    selfAudit: {
        allConstraintsPresent: boolean;
        allRequiredFieldsPopulated: boolean;
        revalidationAttemptsDocumented: boolean;
        schemaConformance: boolean;
    };
    agentExecutionSignature: string | null;
    completionTimestamp: string | null;
    status: string | null;
}
export interface SequentialReportTemplate {
    constraintId: string;
    reportKind: string;
    runId: string;
    executionState: string;
    analysisPerformed: boolean;
    enumeratedFilesCount: number;
    constraintBlocksReceived: number;
    violations: Array<Record<string, unknown>>;
    fixesApplied: string[];
    postFixStatus: {
        revalidated: boolean;
        remainingViolations: number;
    };
    initialViolationCount: number;
    remainingViolationCount: number;
    revalidationAttemptsUsed: number;
    successConditions: {
        allConstraintsEvaluated: boolean;
        noRemainingViolations: boolean;
    };
    selfAudit: {
        allConstraintsPresent: boolean;
        allRequiredFieldsPopulated: boolean;
        revalidationAttemptsDocumented: boolean;
        schemaConformance: boolean;
    };
    agentExecutionSignature: string | null;
    completionTimestamp: string | null;
    status: string | null;
}
export interface BatchInstructionPackage {
    runId: string;
    mode: "batch";
    recommendedOrder: string[];
    ignoredPaths: string[];
    constraints: InstructionConstraintBlock[];
    reportTemplate: BatchReportTemplate;
}
export interface SingleInstructionPackage {
    runId: string;
    mode: "single";
    constraint: InstructionConstraintBlock;
    reportTemplate: SequentialReportTemplate;
}
