/**
 * Metadata describing a constraint's identity, categorization, and enforcement status.
 */
export interface ConstraintMeta {
    /** Unique identifier for the constraint (e.g., "file-naming") */
    id: string;
    /** Human-readable name of the constraint */
    name: string;
    /** Category grouping for the constraint */
    category: string;
    /** Severity level (currently only "error" is supported) */
    severity: "error";
    /** Whether the constraint is enabled by default in the constraint file */
    enabled: boolean;
    /** Whether the constraint is optional and can be disabled via config */
    optional: boolean;
    /** Whether the constraint is currently active (after applying overrides) */
    isActive: boolean;
    /** Version number of the constraint definition */
    version: number;
    /** Order in which this constraint should be enforced (lower numbers first) */
    enforcementOrder: number;
}
/**
 * Configuration for overriding a constraint's enabled state.
 */
export interface ConstraintOverrideConfig {
    /** Whether the constraint should be enabled (true) or disabled (false) */
    enabled: boolean;
}
/**
 * Map of constraint IDs to their override configurations.
 * Used in cda.config.json to enable/disable specific constraints.
 */
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
