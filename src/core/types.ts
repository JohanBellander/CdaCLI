export const CONSTRAINT_GROUPS = [
  "patterns",
  "architecture",
  "best-practices",
  "frameworks",
  "contracts",
] as const;

export type ConstraintGroup = (typeof CONSTRAINT_GROUPS)[number];

export const PHASES = [
  "foundation",
  "domain",
  "infrastructure",
  "application",
  "presentation",
] as const;

export type Phase = (typeof PHASES)[number];

export const PHASE_CONSTRAINTS: Record<Phase, string[]> = {
  foundation: [
    "central-config-entrypoint",
    "observability-discipline",
    "structural-naming-consistency",
    "file-naming",
    "folder-naming",
    "max-file-lines",
    "excessive-nesting",
  ],
  domain: [
    "domain-purity",
    "domain-no-side-effects",
    "domain-no-imports-from-app-or-infra",
    "single-responsibility",
    "module-complexity-guardrails",
    "shared-types-zod-source-of-truth",
    "zod-contracts",
  ],
  infrastructure: [
    "ports-and-adapters-integrity",
    "clean-layer-direction",
    "prisma-data-access",
    "axios-client-only",
    "api-boundary-hygiene",
  ],
  application: [
    "mvc-layer-separation",
    "mvp-presenter-boundaries",
    "mvvm-binding-integrity",
    "app-no-imports-from-infra",
    "ui-isolation",
    "test-coverage-contracts",
  ],
  presentation: [
    "fastify-http-server",
    "nextjs-app-structure",
    "react-ui-only",
    "tanstack-query-async",
  ],
};

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
