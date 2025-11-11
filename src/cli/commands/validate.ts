import { loadConstraints, partitionConstraints } from "../../core/constraintLoader.js";
import {
  buildBatchInstructionPackage,
  buildSingleInstructionPackage,
} from "../../core/instructionEmitter.js";
import { generateRunId } from "../../core/runId.js";
import { createError } from "../../core/errors.js";
import { loadProjectConfig } from "../../core/projectConfig.js";
import {
  formatBatchInstructionPackage,
  formatLegacyBatchInstructionPackage,
  formatLegacySingleInstructionPackage,
  formatSingleInstructionPackage,
} from "../formatters.js";
import { logDisabledConstraints } from "../constraintLogging.js";

interface ValidateCommandOptions {
  cwd?: string;
  constraintsDir?: string;
}

export async function runValidateCommand(
  args: string[] = [],
  options: ValidateCommandOptions = {},
): Promise<void> {
  if (args.includes("-h") || args.includes("--help")) {
    printValidateHelp();
    return;
  }

  const parsed = parseValidateArgs(args);
  const cwd = options.cwd ?? process.cwd();
  const projectConfig = await loadProjectConfig({ cwd, required: false });
  const constraints = await loadConstraints({
    constraintsDir: options.constraintsDir,
    constraintOverrides: projectConfig?.constraintOverrides,
  });
  if (constraints.length === 0) {
    throw createError("BUNDLE_ERROR", "No constraints available to validate.");
  }
  const { active: activeConstraints, disabled } = partitionConstraints(constraints);
  if (disabled.length > 0) {
    logDisabledConstraints(disabled, console.error);
  }
  if (activeConstraints.length === 0) {
    throw createError("CONFIG_ERROR", "No active constraints available.");
  }

  const runId = generateRunId();

  if (parsed.constraintId || parsed.sequential) {
    const targetId = parsed.constraintId ?? activeConstraints[0]?.meta.id;
    if (!targetId) {
      throw createError("CONFIG_ERROR", "No constraints available.");
    }
    const constraint = activeConstraints.find((doc) => doc.meta.id === targetId);
    if (!constraint) {
      const disabledMatch = constraints.find((doc) => doc.meta.id === targetId);
      if (disabledMatch) {
        throw createError("CONFIG_ERROR", `Constraint '${targetId}' is disabled.`);
      }
      throw createError("CONFIG_ERROR", `Unknown constraint '${targetId}'.`);
    }

    const pkg = buildSingleInstructionPackage({ runId, constraint });
    const rendered = parsed.legacyFormat
      ? formatLegacySingleInstructionPackage(pkg)
      : formatSingleInstructionPackage(pkg);
    console.log(rendered);
    return;
  }

  const pkg = buildBatchInstructionPackage({ runId, constraints: activeConstraints });
  const rendered = parsed.legacyFormat
    ? formatLegacyBatchInstructionPackage(pkg)
    : formatBatchInstructionPackage(pkg);
  console.log(rendered);
}

function parseValidateArgs(args: string[]): {
  constraintId?: string;
  sequential: boolean;
  legacyFormat: boolean;
} {
  const result: {
    constraintId?: string;
    sequential: boolean;
    legacyFormat: boolean;
  } = {
    sequential: false,
    legacyFormat: false,
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--constraint" || arg === "-c") {
      const next = args[i + 1];
      if (!next) {
        throw createError("CONFIG_ERROR", "Expected constraint id after --constraint.");
      }
      result.constraintId = next;
      i += 1;
      continue;
    }

    if (arg === "--sequential") {
      result.sequential = true;
      continue;
    }

    if (arg === "--legacy-format") {
      result.legacyFormat = true;
      continue;
    }

    throw createError("CONFIG_ERROR", `Unknown option '${arg}'.`);
  }

  if (result.constraintId && result.sequential) {
    throw createError("CONFIG_ERROR", "Use either --constraint or --sequential, not both.");
  }

  return result;
}

function printValidateHelp(): void {
  console.log("Usage: cda validate [--constraint <id>] [--sequential]");
  console.log("");
  console.log("Options:");
  console.log("  --constraint, -c <id>   Emit instructions for a single constraint.");
  console.log("  --sequential            Alias for the first constraint in recommended order.");
  console.log(
    "  --legacy-format         Emit the deprecated pre-update output (instruction-only banner omitted).",
  );
}
