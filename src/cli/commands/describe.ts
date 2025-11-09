import { loadConstraints } from "../../core/constraintLoader.js";
import { createError } from "../../core/errors.js";
import { loadProjectConfig } from "../../core/projectConfig.js";

const SECTIONS_TO_PRINT = [
  "PURPOSE",
  "VALIDATION ALGORITHM (PSEUDOCODE)",
  "REPORTING CONTRACT",
  "FIX SEQUENCE (STRICT)",
  "SUCCESS CRITERIA (MUST)",
  "POST-FIX ASSERTIONS",
] as const;

interface DescribeCommandOptions {
  cwd?: string;
  constraintsDir?: string;
}

export async function runDescribeCommand(
  args: string[] = [],
  options: DescribeCommandOptions = {},
): Promise<void> {
  if (args.length === 0 || args.includes("-h") || args.includes("--help")) {
    printDescribeHelp();
    return;
  }

  const [constraintId] = args;
  const cwd = options.cwd ?? process.cwd();
  const projectConfig = await loadProjectConfig({ cwd, required: false });
  const constraints = await loadConstraints({
    constraintsDir: options.constraintsDir,
    constraintOverrides: projectConfig?.constraintOverrides,
  });
  const constraint = constraints.find((doc) => doc.meta.id === constraintId);
  if (!constraint) {
    throw createError(
      "CONFIG_ERROR",
      `Unknown constraint '${constraintId}'.`,
    );
  }
  if (!constraint.meta.isActive) {
    throw createError(
      "CONFIG_ERROR",
      `Constraint '${constraintId}' is disabled by configuration.`,
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
