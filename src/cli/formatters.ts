import {
  BatchInstructionPackage,
  InstructionConstraintBlock,
  SingleInstructionPackage,
} from "../core/types.js";
import { INSTRUCTION_FORMAT_VERSION } from "../core/instructionFormat.js";

const AGENT_ACTION_REQUIRED_BLOCK = [
  "AGENT ACTION REQUIRED:",
  "  1. Do NOT assume zero violations.",
  "  2. For EACH constraint block:",
  "     a. Build REQUIRED DATA COLLECTION structures.",
  "     b. Execute detection_steps exactly in order.",
  "     c. Record initial violations BEFORE remediation.",
  "     d. Apply FIX SEQUENCE strictly.",
  "     e. Re-run detection (up to 2 attempts). If violations remain -> mark status: failed.",
  "  3. Populate the EXPECTED AGENT REPORT FORMAT.",
  "  4. Set execution_state: validated (or failed) only after full loop.",
  "  5. Include disputed violations rather than omitting them.",
];

const DO_NOT_BLOCK = [
  "DO NOT:",
  "- Omit required keys when arrays are empty.",
  "- Declare success without enumerating all relevant files.",
  "- Fabricate fixes_applied when there were zero initial violations.",
  "- Skip revalidation when initial violations > 0.",
  "- Remove constraint blocks from the final report.",
];

export function formatBatchInstructionPackage(pkg: BatchInstructionPackage): string {
  const lines: string[] = [];
  lines.push("CDA VALIDATION INSTRUCTION PACKAGE (MVP1)");
  lines.push("analysis_performed: false");
  lines.push("execution_state: unvalidated");
  lines.push(
    "INSTRUCTION PACKAGE ONLY - NO SOURCE ANALYSIS PERFORMED - AGENT MUST EXECUTE DETECTION STEPS",
  );
  lines.push("NOTE: CLI EXIT CODE 0 DOES NOT INDICATE ARCHITECTURAL COMPLIANCE.");
  lines.push(`instruction_format_version: ${INSTRUCTION_FORMAT_VERSION}`);
  lines.push("");
  AGENT_ACTION_REQUIRED_BLOCK.forEach((line) => lines.push(line));
  lines.push("");
  DO_NOT_BLOCK.forEach((line) => lines.push(line));
  lines.push("");
  lines.push("===== BEGIN CDA INSTRUCTIONS (TO EXECUTE) =====");
  lines.push(`run_id: ${pkg.runId}`);
  lines.push(`mode: ${pkg.mode}`);
  lines.push(`recommended_order: ${formatList(pkg.recommendedOrder, { quoted: false })}`);
  lines.push(`ignored_paths: ${formatList(pkg.ignoredPaths, { quoted: true })}`);
  lines.push("");

  pkg.constraints.forEach((block, index) => {
    lines.push(...formatConstraintBlock(block));
    if (index < pkg.constraints.length - 1) {
      lines.push("");
    }
  });

  lines.push("===== END CDA INSTRUCTIONS =====");
  lines.push("");
  lines.push("===== BEGIN EXPECTED AGENT REPORT FORMAT (FILL AFTER EXECUTION) =====");
  lines.push(...formatBatchReportTemplate(pkg));
  lines.push("===== END EXPECTED AGENT REPORT FORMAT =====");

  return lines.join("\n").trimEnd();
}

export function formatSingleInstructionPackage(pkg: SingleInstructionPackage): string {
  const lines: string[] = [];
  lines.push("CDA SINGLE-CONSTRAINT INSTRUCTION PACKAGE (MVP1)");
  lines.push("analysis_performed: false");
  lines.push("execution_state: unvalidated");
  lines.push(
    "INSTRUCTION PACKAGE ONLY - NO SOURCE ANALYSIS PERFORMED - AGENT MUST EXECUTE DETECTION STEPS",
  );
  lines.push("NOTE: CLI EXIT CODE 0 DOES NOT INDICATE ARCHITECTURAL COMPLIANCE.");
  lines.push(`instruction_format_version: ${INSTRUCTION_FORMAT_VERSION}`);
  lines.push("");
  AGENT_ACTION_REQUIRED_BLOCK.forEach((line) => lines.push(line));
  lines.push("");
  DO_NOT_BLOCK.forEach((line) => lines.push(line));
  lines.push("");
  lines.push("===== BEGIN CDA INSTRUCTIONS (TO EXECUTE) =====");
  lines.push(`run_id: ${pkg.runId}`);
  lines.push(`mode: ${pkg.mode}`);
  lines.push(`constraint_id: ${pkg.constraint.constraintId}`);
  lines.push("");
  lines.push(...formatConstraintBlock(pkg.constraint));
  lines.push("===== END CDA INSTRUCTIONS =====");
  lines.push("");
  lines.push("===== BEGIN EXPECTED AGENT REPORT FORMAT (FILL AFTER EXECUTION) =====");
  lines.push(...formatSequentialReportTemplate(pkg));
  lines.push("===== END EXPECTED AGENT REPORT FORMAT =====");

  return lines.join("\n").trimEnd();
}

export function formatLegacyBatchInstructionPackage(pkg: BatchInstructionPackage): string {
  const lines: string[] = [];
  lines.push("CDA VALIDATION INSTRUCTION PACKAGE");
  lines.push(`run_id: ${pkg.runId}`);
  lines.push(`mode: ${pkg.mode}`);
  lines.push(`recommended_order: ${formatList(pkg.recommendedOrder, { quoted: false })}`);
  lines.push(`ignored_paths: ${formatList(pkg.ignoredPaths, { quoted: true })}`);
  lines.push("");

  pkg.constraints.forEach((block, index) => {
    lines.push(...formatConstraintBlock(block, { legacy: true }));
    if (index < pkg.constraints.length - 1) {
      lines.push("");
    }
  });

  lines.push("");
  lines.push("REPORT TEMPLATE");
  lines.push(...formatLegacyBatchReportTemplate(pkg));

  return lines.join("\n").trimEnd();
}

export function formatLegacySingleInstructionPackage(pkg: SingleInstructionPackage): string {
  const lines: string[] = [];
  lines.push("CDA SINGLE-CONSTRAINT INSTRUCTION PACKAGE");
  lines.push(`run_id: ${pkg.runId}`);
  lines.push(`mode: ${pkg.mode}`);
  lines.push("");
  lines.push(...formatConstraintBlock(pkg.constraint, { legacy: true }));
  lines.push("");
  lines.push("REPORT TEMPLATE");
  lines.push(...formatLegacySequentialReportTemplate(pkg));
  return lines.join("\n").trimEnd();
}

function formatConstraintBlock(
  block: InstructionConstraintBlock,
  options: { legacy?: boolean } = {},
): string[] {
  const lines: string[] = [];
  if (options.legacy) {
    lines.push(`CONSTRAINT: ${block.constraintId}`);
  } else {
    lines.push(`CONSTRAINT (INSTRUCTION ONLY - NO DETECTION YET): ${block.constraintId}`);
  }
  lines.push(`enforcement_order: ${block.enforcementOrder}`);
  lines.push(`objective: ${block.objective}`);
  lines.push("detection_steps:");
  block.detectionSteps.forEach((step, index) => {
    lines.push(`  ${index + 1}. ${step}`);
  });
  lines.push(`report_fields: ${formatList(block.reportFields, { quoted: false })}`);
  lines.push(`pass_criteria: ${block.passCriteria}`);
  lines.push(`fix_strategy: ${block.fixStrategy}`);
  lines.push("self_verification_checklist:");
  block.selfVerificationChecklist.forEach((item) => {
    lines.push(`  - ${item}`);
  });

  return lines;
}

function formatLegacyBatchReportTemplate(pkg: BatchInstructionPackage): string[] {
  const { reportTemplate } = pkg;
  const lines: string[] = [];
  lines.push("summary:");
  lines.push(`  analyzed_files: ${reportTemplate.summary.analyzedFiles}`);
  lines.push(`  constraints_evaluated: ${reportTemplate.summary.constraintsEvaluated}`);
  lines.push(`  total_violations: ${reportTemplate.summary.totalViolations}`);
  lines.push("violations: []");
  lines.push("fixes_applied: []");
  lines.push("post_fix_status:");
  lines.push(`  revalidated: ${reportTemplate.postFixStatus.revalidated}`);
  lines.push(`  remaining_violations: ${reportTemplate.postFixStatus.remainingViolations}`);
  return lines;
}

function formatLegacySequentialReportTemplate(pkg: SingleInstructionPackage): string[] {
  const template = pkg.reportTemplate;
  const lines: string[] = [];
  lines.push(`constraint_id: ${template.constraintId}`);
  lines.push("violations: []");
  lines.push("fixes_applied: []");
  lines.push(`revalidated_zero: ${template.postFixStatus.revalidated}`);
  lines.push(`completion_timestamp: ""`);
  return lines;
}

function formatBatchReportTemplate(pkg: BatchInstructionPackage): string[] {
  const { reportTemplate } = pkg;
  const lines: string[] = [];
  lines.push(`report_kind: ${reportTemplate.reportKind}`);
  lines.push(`run_id: ${reportTemplate.runId}`);
  lines.push(`execution_state: ${reportTemplate.executionState}`);
  lines.push(`analysis_performed: ${reportTemplate.analysisPerformed}`);
  lines.push("summary:");
  lines.push(`  analyzed_files: ${reportTemplate.summary.analyzedFiles}`);
  lines.push(`  constraints_evaluated: ${reportTemplate.summary.constraintsEvaluated}`);
  lines.push(`  total_violations: ${reportTemplate.summary.totalViolations}`);
  lines.push(`enumerated_files_count: ${reportTemplate.enumeratedFilesCount}`);
  lines.push(`constraint_blocks_received: ${reportTemplate.constraintBlocksReceived}`);
  lines.push("violations: []");
  lines.push("fixes_applied: []");
  lines.push(`initial_violation_count: ${reportTemplate.initialViolationCount}`);
  lines.push(`remaining_violation_count: ${reportTemplate.remainingViolationCount}`);
  lines.push("post_fix_status:");
  lines.push(`  revalidated: ${reportTemplate.postFixStatus.revalidated}`);
  lines.push(`  remaining_violations: ${reportTemplate.postFixStatus.remainingViolations}`);
  lines.push(`revalidation_attempts_used: ${reportTemplate.revalidationAttemptsUsed}`);
  lines.push("success_conditions:");
  lines.push(
    `  all_constraints_evaluated: ${reportTemplate.successConditions.allConstraintsEvaluated}`,
  );
  lines.push(
    `  no_remaining_violations: ${reportTemplate.successConditions.noRemainingViolations}`,
  );
  lines.push("self_audit:");
  lines.push(`  all_constraints_present: ${reportTemplate.selfAudit.allConstraintsPresent}`);
  lines.push(
    `  all_required_fields_populated: ${reportTemplate.selfAudit.allRequiredFieldsPopulated}`,
  );
  lines.push(
    `  revalidation_attempts_documented: ${reportTemplate.selfAudit.revalidationAttemptsDocumented}`,
  );
  lines.push(`  schema_conformance: ${reportTemplate.selfAudit.schemaConformance}`);
  lines.push(
    `agent_execution_signature: ${formatNullable(reportTemplate.agentExecutionSignature)}`,
  );
  lines.push(`completion_timestamp: ${formatNullable(reportTemplate.completionTimestamp)}`);
  lines.push(`status: ${formatNullable(reportTemplate.status)}`);
  return lines;
}

function formatSequentialReportTemplate(pkg: SingleInstructionPackage): string[] {
  const template = pkg.reportTemplate;
  const lines: string[] = [];
  lines.push(`report_kind: ${template.reportKind}`);
  lines.push(`run_id: ${template.runId}`);
  lines.push(`constraint_id: ${template.constraintId}`);
  lines.push(`execution_state: ${template.executionState}`);
  lines.push(`analysis_performed: ${template.analysisPerformed}`);
  lines.push(`constraint_blocks_received: ${template.constraintBlocksReceived}`);
  lines.push(`enumerated_files_count: ${template.enumeratedFilesCount}`);
  lines.push("violations: []");
  lines.push("fixes_applied: []");
  lines.push(`initial_violation_count: ${template.initialViolationCount}`);
  lines.push(`remaining_violation_count: ${template.remainingViolationCount}`);
  lines.push("post_fix_status:");
  lines.push(`  revalidated: ${template.postFixStatus.revalidated}`);
  lines.push(`  remaining_violations: ${template.postFixStatus.remainingViolations}`);
  lines.push(`revalidation_attempts_used: ${template.revalidationAttemptsUsed}`);
  lines.push("success_conditions:");
  lines.push(`  all_constraints_evaluated: ${template.successConditions.allConstraintsEvaluated}`);
  lines.push(`  no_remaining_violations: ${template.successConditions.noRemainingViolations}`);
  lines.push("self_audit:");
  lines.push(`  all_constraints_present: ${template.selfAudit.allConstraintsPresent}`);
  lines.push(`  all_required_fields_populated: ${template.selfAudit.allRequiredFieldsPopulated}`);
  lines.push(
    `  revalidation_attempts_documented: ${template.selfAudit.revalidationAttemptsDocumented}`,
  );
  lines.push(`  schema_conformance: ${template.selfAudit.schemaConformance}`);
  lines.push(`agent_execution_signature: ${formatNullable(template.agentExecutionSignature)}`);
  lines.push(`completion_timestamp: ${formatNullable(template.completionTimestamp)}`);
  lines.push(`status: ${formatNullable(template.status)}`);
  return lines;
}

function formatNullable(value: string | null): string {
  return value === null || value === "" ? "null" : value;
}

function formatList(items: string[], options: { quoted?: boolean } = {}): string {
  if (items.length === 0) {
    return "[]";
  }

  const quoted = options.quoted ?? false;
  const rendered = items.map((item) => (quoted ? `"${item}"` : item)).join(", ");

  return `[${rendered}]`;
}
