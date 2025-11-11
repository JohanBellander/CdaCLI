import {
  BatchInstructionPackage,
  InstructionConstraintBlock,
  SingleInstructionPackage,
} from "./types.js";
import { ConstraintDocument } from "./constraintLoader.js";

export const DEFAULT_IGNORED_PATHS = ["node_modules", "dist", "build", ".git"] as const;

export interface BatchPackageOptions {
  runId: string;
  constraints: ConstraintDocument[];
  ignoredPaths?: string[];
}

export interface SinglePackageOptions {
  runId: string;
  constraint: ConstraintDocument;
}

export function buildBatchInstructionPackage(
  options: BatchPackageOptions,
): BatchInstructionPackage {
  const { runId, constraints, ignoredPaths } = options;
  const sortedConstraints = [...constraints].sort((a, b) => {
    if (a.meta.enforcementOrder === b.meta.enforcementOrder) {
      return a.meta.id.localeCompare(b.meta.id);
    }
    return a.meta.enforcementOrder - b.meta.enforcementOrder;
  });

  const blocks = sortedConstraints.map(toInstructionBlock);
  const recommendedOrder = sortedConstraints.map((doc) => doc.meta.id);

  return {
    runId,
    mode: "batch",
    recommendedOrder,
    ignoredPaths: ignoredPaths ?? [...DEFAULT_IGNORED_PATHS],
    constraints: blocks,
    reportTemplate: {
      reportKind: "cda_validation_result",
      runId,
      executionState: "unvalidated",
      analysisPerformed: false,
      enumeratedFilesCount: 0,
      constraintBlocksReceived: blocks.length,
      summary: {
        analyzedFiles: 0,
        constraintsEvaluated: blocks.length,
        totalViolations: 0,
      },
      violations: [],
      fixesApplied: [],
      postFixStatus: {
        revalidated: false,
        remainingViolations: 0,
      },
      initialViolationCount: 0,
      remainingViolationCount: 0,
      revalidationAttemptsUsed: 0,
      successConditions: {
        allConstraintsEvaluated: false,
        noRemainingViolations: false,
      },
      selfAudit: {
        allConstraintsPresent: false,
        allRequiredFieldsPopulated: false,
        revalidationAttemptsDocumented: false,
        schemaConformance: false,
      },
      agentExecutionSignature: null,
      completionTimestamp: null,
      status: null,
    },
  };
}

export function buildSingleInstructionPackage(
  options: SinglePackageOptions,
): SingleInstructionPackage {
  const { runId, constraint } = options;
  const block = toInstructionBlock(constraint);

  return {
    runId,
    mode: "single",
    constraint: block,
    reportTemplate: {
      reportKind: "cda_single_constraint_validation_result",
      runId,
      constraintId: block.constraintId,
      executionState: "unvalidated",
      analysisPerformed: false,
      enumeratedFilesCount: 0,
      constraintBlocksReceived: 1,
      violations: [],
      fixesApplied: [],
      postFixStatus: {
        revalidated: false,
        remainingViolations: 0,
      },
      initialViolationCount: 0,
      remainingViolationCount: 0,
      revalidationAttemptsUsed: 0,
      successConditions: {
        allConstraintsEvaluated: false,
        noRemainingViolations: false,
      },
      selfAudit: {
        allConstraintsPresent: false,
        allRequiredFieldsPopulated: false,
        revalidationAttemptsDocumented: false,
        schemaConformance: false,
      },
      agentExecutionSignature: null,
      completionTimestamp: null,
      status: null,
    },
  };
}

function toInstructionBlock(doc: ConstraintDocument): InstructionConstraintBlock {
  const sections = doc.sections;
  const detectionSteps = extractDetectionSteps(sections["VALIDATION ALGORITHM (PSEUDOCODE)"]);
  const reportFields = extractReportFields(sections["REPORTING CONTRACT"], doc.meta.id);
  const successCriteria = extractBulletList(sections["SUCCESS CRITERIA (MUST)"]);
  const fixSteps = extractBulletList(sections["FIX SEQUENCE (STRICT)"]);
  const selfVerificationChecklist = extractBulletList(sections["POST-FIX ASSERTIONS"]);

  return {
    constraintId: doc.meta.id,
    enforcementOrder: doc.meta.enforcementOrder,
    objective: normalizeWhitespace(sections.PURPOSE),
    detectionSteps,
    reportFields,
    passCriteria: successCriteria.join("; "),
    fixStrategy: fixSteps[0] ?? "Follow FIX SEQUENCE (STRICT).",
    selfVerificationChecklist,
  };
}

function extractDetectionSteps(section: string): string[] {
  const lines = section.split(/\r?\n/);
  const steps: string[] = [];
  let capturing = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!capturing && /^detection_steps:/i.test(line)) {
      capturing = true;
      continue;
    }

    if (!capturing) continue;
    if (line.startsWith("```")) break;
    if (line.length === 0) continue;

    const bulletMatch = line.match(/^(?:[-*]|\d+\.)\s+(.*)$/);
    if (bulletMatch) {
      steps.push(bulletMatch[1].trim());
      continue;
    }

    if (steps.length > 0) {
      steps[steps.length - 1] = `${steps[steps.length - 1]} ${line}`;
    }
  }

  if (steps.length === 0) {
    return [normalizeWhitespace(section)];
  }

  return steps;
}

function extractReportFields(section: string, constraintId: string): string[] {
  const lines = section.split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    const match = line.match(/(?:keys|report_fields)[^:]*:\s*(.+)$/i);
    if (!match) continue;
    let remainder = match[1].trim();
    const bracketIndex = remainder.indexOf("]");
    if (bracketIndex !== -1) {
      remainder = remainder.slice(0, bracketIndex);
    }
    const periodIndex = remainder.indexOf(".");
    if (periodIndex !== -1) {
      remainder = remainder.slice(0, periodIndex);
    }
    remainder = remainder.replace(/^\[/, "");
    const fields = remainder
      .split(/[,;]/)
      .map((value) => value.trim())
      .filter(Boolean);
    if (fields.length > 0) {
      return fields;
    }
  }
  throw new Error(`REPORTING CONTRACT missing required keys definition for ${constraintId}.`);
}

function extractBulletList(section: string): string[] {
  const lines = section.split(/\r?\n/);
  const items: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    const match = line.match(/^(?:[-*]|\d+\.)\s+(.*)$/);
    if (match) {
      items.push(match[1].trim());
      continue;
    }

    if (items.length === 0) {
      items.push(line);
    } else {
      items[items.length - 1] = `${items[items.length - 1]} ${line}`;
    }
  }

  return items;
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}
