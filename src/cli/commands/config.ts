import { rename, writeFile } from "node:fs/promises";

import { loadConstraints } from "../../core/constraintLoader.js";
import {
  buildConfigConstraintState,
  computeConstraintOverridesFromState,
  type ConfigConstraintState,
} from "../../core/configConstraintState.js";
import { loadProjectConfig } from "../../core/projectConfig.js";
import { PROJECT_CONFIG_FILENAME } from "../../core/projectConfig.js";
import { createError } from "../../core/errors.js";
import type { ConstraintOverrides } from "../../core/types.js";
import {
  type ConfigCommandResult,
  runConfigInteractiveUi,
} from "../ui/configTui.js";

export type { ConfigCommandResult } from "../ui/configTui.js";

const CONFIG_HELP_TEXT = [
  "cda config (experimental)",
  "",
  "Usage:",
  "  cda config [options]",
  "",
  "Options:",
  "  --help, -h   Show this help message and exit.",
  "",
  "Use this command to edit constraint_overrides without touching JSON.",
  "Arrow keys move, Space toggles constraints, Enter/Ctrl+S saves,",
  "and Esc/q cancels. You must run it inside an interactive terminal (TTY).",
].join("\n");

interface ConfigCommandOptions {
  cwd?: string;
  constraintsDir?: string;
  stdin?: NodeJS.ReadStream;
  stdout?: NodeJS.WriteStream;
  runInteractive?: (
    state: ConfigConstraintState[],
    options: {
      stdin: NodeJS.ReadStream;
      stdout: NodeJS.WriteStream;
      projectRoot: string;
    },
  ) => Promise<ConfigCommandResult>;
}

export async function runConfigCommand(
  args: string[],
  options: ConfigCommandOptions = {},
): Promise<ConfigCommandResult | void> {
  if (hasHelpFlag(args)) {
    printConfigHelp();
    return;
  }

  const cwd = options.cwd ?? process.cwd();
  const stdin = options.stdin ?? process.stdin;
  const stdout = options.stdout ?? process.stdout;

  if (!(stdin.isTTY && stdout.isTTY)) {
    throw createError(
      "CONFIG_ERROR",
      "cda config requires an interactive TTY. Run from a terminal session or pass --help for usage.",
    );
  }

  const projectConfig = await loadProjectConfig({ cwd, required: true });
  if (!projectConfig) {
    throw createError(
      "CONFIG_ERROR",
      "Project config not found. Run `cda init` first.",
    );
  }
  const constraints = await loadConstraints({
    constraintsDir: options.constraintsDir,
    constraintOverrides: projectConfig.constraintOverrides,
  });
  if (constraints.length === 0) {
    throw createError(
      "CONFIG_ERROR",
      "No constraints found for this project. Run `cda init` to scaffold configuration.",
    );
  }

  const state = buildConfigConstraintState(
    constraints,
    projectConfig.constraintOverrides,
  );

  const runner = options.runInteractive ?? runConfigInteractiveUi;
  const result = await runner(state, {
    stdin,
    stdout,
    projectRoot: cwd,
  });

  if (result.status !== "saved") {
    console.log("Exited without saving changes.");
    return result;
  }

  ensureActiveConstraints(result.state);

  // Build full constraint state (all constraints with their enabled status)
  const fullOverrides = buildFullConstraintOverrides(result.state);
  const payload = buildConfigPayload(
    projectConfig.version,
    projectConfig.constraints,
    fullOverrides,
  );

  await writeProjectConfig(projectConfig.path, payload);

  const constraintCount = Object.keys(fullOverrides).length;
  console.log(
    `Updated ${PROJECT_CONFIG_FILENAME} with ${constraintCount} constraint${
      constraintCount === 1 ? "" : "s"
    }.`,
  );

  return result;
}

function hasHelpFlag(args: string[]): boolean {
  return args.some((arg) => arg === "--help" || arg === "-h");
}

function printConfigHelp(): void {
  console.log(CONFIG_HELP_TEXT);
}

function ensureActiveConstraints(state: ConfigConstraintState[]): void {
  if (!state.some((entry) => entry.effectiveEnabled)) {
    throw createError(
      "CONFIG_ERROR",
      "At least one constraint must remain active. Enable a constraint before saving.",
    );
  }
}

function buildFullConstraintOverrides(
  state: ConfigConstraintState[],
): ConstraintOverrides {
  const overrides: ConstraintOverrides = {};
  for (const entry of state) {
    overrides[entry.id] = { enabled: entry.effectiveEnabled };
  }
  return overrides;
}

function buildConfigPayload(
  version: number,
  constraints: string,
  overrides: ConstraintOverrides,
): Record<string, unknown> {
  return {
    version,
    constraints,
    constraint_overrides: overrides,
  };
}

async function writeProjectConfig(
  filePath: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const serialized = `${JSON.stringify(payload, null, 2)}\n`;
  const tempPath = `${filePath}.tmp`;
  await writeFile(tempPath, serialized, "utf8");
  await rename(tempPath, filePath);
}
