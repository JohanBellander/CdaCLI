import {
  BatchInstructionPackage,
  InstructionConstraintBlock,
  SingleInstructionPackage,
} from "../core/types.js";

export function formatBatchInstructionPackage(
  pkg: BatchInstructionPackage,
): string {
  const lines: string[] = [];
  lines.push("CDA VALIDATION INSTRUCTION PACKAGE");
  lines.push(`run_id: ${pkg.runId}`);
  lines.push(`mode: ${pkg.mode}`);
  lines.push(
    `recommended_order: ${formatList(pkg.recommendedOrder, { quoted: false })}`,
  );
  lines.push(
    `ignored_paths: ${formatList(pkg.ignoredPaths, { quoted: true })}`,
  );
  lines.push("");

  pkg.constraints.forEach((block, index) => {
    lines.push(...formatConstraintBlock(block));
    if (index < pkg.constraints.length - 1) {
      lines.push("");
    }
  });

  lines.push("");
  lines.push("REPORT TEMPLATE");
  lines.push(...formatBatchReportTemplate(pkg));

  return lines.join("\n").trimEnd();
}

export function formatSingleInstructionPackage(
  pkg: SingleInstructionPackage,
): string {
  const lines: string[] = [];
  lines.push("CDA SINGLE-CONSTRAINT INSTRUCTION PACKAGE");
  lines.push(`run_id: ${pkg.runId}`);
  lines.push(`mode: ${pkg.mode}`);
  lines.push("");
  lines.push(...formatConstraintBlock(pkg.constraint));
  lines.push("");
  lines.push("REPORT TEMPLATE");
  lines.push(...formatSequentialReportTemplate(pkg));

  return lines.join("\n").trimEnd();
}

function formatConstraintBlock(block: InstructionConstraintBlock): string[] {
  const lines: string[] = [];
  lines.push(`CONSTRAINT: ${block.constraintId}`);
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

function formatBatchReportTemplate(pkg: BatchInstructionPackage): string[] {
  const { reportTemplate } = pkg;
  const lines: string[] = [];
  lines.push("summary:");
  lines.push(`  analyzed_files: ${reportTemplate.summary.analyzedFiles}`);
  lines.push(
    `  constraints_evaluated: ${reportTemplate.summary.constraintsEvaluated}`,
  );
  lines.push(
    `  total_violations: ${reportTemplate.summary.totalViolations}`,
  );
  lines.push("violations: []");
  lines.push("fixes_applied: []");
  lines.push("post_fix_status:");
  lines.push(`  revalidated: ${reportTemplate.postFixStatus.revalidated}`);
  lines.push(
    `  remaining_violations: ${reportTemplate.postFixStatus.remainingViolations}`,
  );
  return lines;
}

function formatSequentialReportTemplate(
  pkg: SingleInstructionPackage,
): string[] {
  const template = pkg.reportTemplate;
  const lines: string[] = [];
  lines.push(`constraint_id: ${template.constraintId}`);
  lines.push("violations: []");
  lines.push("fixes_applied: []");
  lines.push(`revalidated_zero: ${template.revalidatedZero}`);
  lines.push(`completion_timestamp: "${template.completionTimestamp}"`);
  return lines;
}

function formatList(
  items: string[],
  options: { quoted?: boolean } = {},
): string {
  if (items.length === 0) {
    return "[]";
  }

  const quoted = options.quoted ?? false;
  const rendered = items
    .map((item) => (quoted ? `"${item}"` : item))
    .join(", ");

  return `[${rendered}]`;
}
