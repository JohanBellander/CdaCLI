import { readFile } from "node:fs/promises";
import path from "node:path";
import { createError } from "./errors.js";
export const PROJECT_CONFIG_FILENAME = "cda.config.json";
export async function loadProjectConfig(options = {}) {
    const cwd = options.cwd ?? process.cwd();
    const required = options.required ?? true;
    const configPath = path.join(cwd, PROJECT_CONFIG_FILENAME);
    let fileContents;
    try {
        fileContents = await readFile(configPath, "utf8");
    }
    catch (error) {
        const nodeError = error;
        if (nodeError.code === "ENOENT") {
            if (required) {
                throw createError("CONFIG_ERROR", `Project config not found at ${configPath}.`);
            }
            return null;
        }
        throw createError("CONFIG_ERROR", `Unable to read ${configPath}: ${nodeError.message}`);
    }
    let parsed;
    try {
        parsed = JSON.parse(fileContents);
    }
    catch (error) {
        throw createError("CONFIG_ERROR", `Invalid JSON in ${configPath}: ${error.message}`);
    }
    const normalized = normalizeProjectConfig(parsed, configPath);
    return {
        path: configPath,
        ...normalized,
    };
}
function normalizeProjectConfig(value, configPath) {
    if (!isRecord(value)) {
        throw createError("CONFIG_ERROR", `${configPath} must contain a JSON object.`);
    }
    const version = asPositiveInteger(value.version, "version", configPath);
    const constraints = asNonEmptyString(value.constraints, "constraints", configPath);
    const constraintOverrides = normalizeConstraintOverrides(value.constraint_overrides, configPath);
    return { version, constraints, constraintOverrides };
}
function normalizeConstraintOverrides(value, configPath) {
    if (value === undefined) {
        return {};
    }
    if (!isRecord(value)) {
        throw createError("CONFIG_ERROR", `${configPath} constraint_overrides must be an object.`);
    }
    const overrides = {};
    for (const [constraintId, rawOverride] of Object.entries(value)) {
        if (!isRecord(rawOverride)) {
            throw createError("CONFIG_ERROR", `${configPath} constraint_overrides.${constraintId} must be an object.`);
        }
        const enabled = rawOverride.enabled;
        if (typeof enabled !== "boolean") {
            throw createError("CONFIG_ERROR", `${configPath} constraint_overrides.${constraintId}.enabled must be a boolean.`);
        }
        overrides[constraintId] = { enabled };
    }
    return overrides;
}
function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
function asPositiveInteger(value, key, configPath) {
    if (typeof value === "number" && Number.isInteger(value) && value > 0) {
        return value;
    }
    throw createError("CONFIG_ERROR", `${configPath} '${key}' must be a positive integer.`);
}
function asNonEmptyString(value, key, configPath) {
    if (typeof value === "string" && value.length > 0) {
        return value;
    }
    throw createError("CONFIG_ERROR", `${configPath} '${key}' must be a non-empty string.`);
}
