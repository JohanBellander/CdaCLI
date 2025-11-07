import { loadConstraints } from "../../core/constraintLoader.js";
import { createError } from "../../core/errors.js";

const SECTIONS_TO_PRINT = [
  "PURPOSE",
  "VALIDATION ALGORITHM (PSEUDOCODE)",
  "REPORTING CONTRACT",
  "FIX SEQUENCE (STRICT)",
  "SUCCESS CRITERIA (MUST)",
  "POST-FIX ASSERTIONS",
] as const;

export async function runDescribeCommand(args: string[] = []): Promise<void> {
  if (args.length === 0 || args.includes("-h") || args.includes("--help")) {
    printDescribeHelp();
    return;
  }

  const [constraintId] = args;
  const constraints = await loadConstraints();
  const constraint = constraints.find((doc) => doc.meta.id === constraintId);
  if (!constraint) {
    throw createError(
      "CONFIG_ERROR",
      `Unknown constraint '${constraintId}'.`,
    );
  }

  const lines: string[] = [];
  lines.push(
    `CONSTRAINT: ${constraint.meta.name} (${constraint.meta.id})`,
  );
  lines.push(`enforcement_order: ${constraint.meta.enforcementOrder}`);
  lines.push("");

  SECTIONS_TO_PRINT.forEach((section) => {
    lines.push(section);
    lines.push(constraint.sections[section]);
    lines.push("");
  });

  console.log(lines.join("\n").trimEnd());
}

function printDescribeHelp(): void {
  console.log("Usage: cda describe <constraint_id>");
  console.log("Example: cda describe domain-no-imports-from-app-or-infra");
}
