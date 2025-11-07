export interface ConstraintMeta {
  id: string;
  name: string;
  category: string;
  severity: "error";
  enabled: boolean;
  version: number;
  enforcementOrder: number;
}

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
}

export interface SequentialReportTemplate {
  constraintId: string;
  violations: Array<Record<string, unknown>>;
  fixesApplied: string[];
  revalidatedZero: boolean;
  completionTimestamp: string;
  status?: "failed";
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
