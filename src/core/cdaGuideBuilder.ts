import {
  CONSTRAINT_SECTION_ORDER,
  ConstraintDocument,
} from "./constraintLoader.js";
import { WORKFLOW_CHECKLIST } from "./workflow.js";

const SECTION_SEQUENCE = CONSTRAINT_SECTION_ORDER.filter(
  (section) => section !== "HEADER",
);

export function buildCdaGuide(constraints: ConstraintDocument[]): string {
  const ordered = [...constraints].sort((a, b) => {
    if (a.meta.enforcementOrder === b.meta.enforcementOrder) {
      return a.meta.id.localeCompare(b.meta.id);
    }
    return a.meta.enforcementOrder - b.meta.enforcementOrder;
  });

  const lines: string[] = [];
  lines.push("# Constraint-Driven Architecture (CDA) Guide");
  lines.push("");
  lines.push(
    "This document contains the authoritative Constraint Enforcement Protocols bundled with the CDA CLI. Follow it verbatim to plan, execute, and verify every architecture change.",
  );
  lines.push("");

  lines.push("## Workflow Checklist");
  lines.push("");
  WORKFLOW_CHECKLIST.forEach((item, index) => {
    lines.push(`${index + 1}. ${item}`);
  });
  lines.push("");

  lines.push("## Constraint Quick Reference");
  lines.push("");
  for (const constraint of ordered) {
    const objective = sanitizeWhitespace(constraint.sections.PURPOSE);
    lines.push(
      `- \`${constraint.meta.id}\` (order ${constraint.meta.enforcementOrder}): ${constraint.meta.name}`,
    );
    lines.push(`  - Objective: ${objective}`);
    lines.push("");
  }

  lines.push("## Constraint Enforcement Protocols");
  lines.push("");
  for (const constraint of ordered) {
    lines.push(`### ${constraint.meta.id} -- ${constraint.meta.name}`);
    lines.push("");
    lines.push("#### HEADER");
    lines.push("");
    lines.push("```");
    lines.push(`constraint_id: ${constraint.header.constraintId}`);
    lines.push(`severity: ${constraint.header.severity}`);
    lines.push(`enforcement_order: ${constraint.header.enforcementOrder}`);
    lines.push("```");
    lines.push("");

    for (const sectionName of SECTION_SEQUENCE) {
      lines.push(`#### ${sectionName}`);
      lines.push("");
      lines.push(constraint.sections[sectionName]);
      lines.push("");
    }
  }

  return lines.join("\n").trimEnd() + "\n";
}

function sanitizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}
