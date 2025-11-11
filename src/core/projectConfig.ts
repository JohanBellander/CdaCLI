import { readFile } from "node:fs/promises";
import path from "node:path";

import { createError } from "./errors.js";
import type { ConstraintOverrides } from "./types.js";

export const PROJECT_CONFIG_FILENAME = "cda.config.json";

export interface ProjectConfig {
  path: string;
  version: number;
  constraints: string;
  constraintOverrides: ConstraintOverrides;
}

interface LoadProjectConfigOptions {
  cwd?: string;
  required?: boolean;
}

export async function loadProjectConfig(
  options: LoadProjectConfigOptions = {},
): Promise<ProjectConfig | null> {
  const cwd = options.cwd ?? process.cwd();
  const required = options.required ?? true;
  const configPath = path.join(cwd, PROJECT_CONFIG_FILENAME);

  let fileContents: string;
  try {
    fileContents = await readFile(configPath, "utf8");
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code === "ENOENT") {
      if (required) {
        throw createError("CONFIG_ERROR", `Project config not found at ${configPath}.`);
      }
      return null;
    }
    throw createError("CONFIG_ERROR", `Unable to read ${configPath}: ${nodeError.message}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(fileContents);
  } catch (error) {
    throw createError("CONFIG_ERROR", `Invalid JSON in ${configPath}: ${(error as Error).message}`);
  }

  const normalized = normalizeProjectConfig(parsed, configPath);
  return {
    path: configPath,
    ...normalized,
  };
}

function normalizeProjectConfig(
  value: unknown,
  configPath: string,
): {
  version: number;
  constraints: string;
  constraintOverrides: ConstraintOverrides;
} {
  if (!isRecord(value)) {
    throw createError("CONFIG_ERROR", `${configPath} must contain a JSON object.`);
  }

  const version = asPositiveInteger(value.version, "version", configPath);
  const constraints = asNonEmptyString(value.constraints, "constraints", configPath);
  const constraintOverrides = normalizeConstraintOverrides(value.constraint_overrides, configPath);

  return { version, constraints, constraintOverrides };
}

function normalizeConstraintOverrides(value: unknown, configPath: string): ConstraintOverrides {
  if (value === undefined) {
    return {};
  }

  if (!isRecord(value)) {
    throw createError("CONFIG_ERROR", `${configPath} constraint_overrides must be an object.`);
  }

  const overrides: ConstraintOverrides = {};
  for (const [constraintId, rawOverride] of Object.entries(value)) {
    if (!isRecord(rawOverride)) {
      throw createError(
        "CONFIG_ERROR",
        `${configPath} constraint_overrides.${constraintId} must be an object.`,
      );
    }

    const enabled = rawOverride.enabled;
    if (typeof enabled !== "boolean") {
      throw createError(
        "CONFIG_ERROR",
        `${configPath} constraint_overrides.${constraintId}.enabled must be a boolean.`,
      );
    }

    overrides[constraintId] = { enabled };
  }

  return overrides;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asPositiveInteger(value: unknown, key: string, configPath: string): number {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }
  throw createError("CONFIG_ERROR", `${configPath} '${key}' must be a positive integer.`);
}

function asNonEmptyString(value: unknown, key: string, configPath: string): string {
  if (typeof value === "string" && value.length > 0) {
    return value;
  }
  throw createError("CONFIG_ERROR", `${configPath} '${key}' must be a non-empty string.`);
}
