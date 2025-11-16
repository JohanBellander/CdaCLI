import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CONSTRAINT_GROUPS, } from "./types.js";
import { createError } from "./errors.js";
export const CONSTRAINT_SECTION_ORDER = [
    "HEADER",
    "PURPOSE",
    "SCOPE",
    "DEFINITIONS",
    "FORBIDDEN",
    "ALLOWED",
    "REQUIRED DATA COLLECTION",
    "VALIDATION ALGORITHM (PSEUDOCODE)",
    "REPORTING CONTRACT",
    "FIX SEQUENCE (STRICT)",
    "REVALIDATION LOOP",
    "SUCCESS CRITERIA (MUST)",
    "FAILURE HANDLING",
    "COMMON MISTAKES",
    "POST-FIX ASSERTIONS",
    "FINAL REPORT SAMPLE",
];
const DEFAULT_CONSTRAINT_DIRS = [
    fileURLToPath(new URL("../constraints/core", import.meta.url)),
];
export async function loadConstraints(options = {}) {
    const directories = options.constraintsDir
        ? [options.constraintsDir]
        : DEFAULT_CONSTRAINT_DIRS;
    const filesByDir = await Promise.all(directories.map((dir) => readConstraintFiles(dir)));
    const files = filesByDir.flat();
    if (files.length === 0) {
        throw bundleError("global", "No constraint markdown files found.");
    }
    const documents = await Promise.all(files.map((filePath) => parseConstraintFile(filePath)));
    const merged = applyConstraintOverrides(documents, options.constraintOverrides);
    return merged.sort((a, b) => {
        if (a.meta.enforcementOrder === b.meta.enforcementOrder) {
            return a.meta.id.localeCompare(b.meta.id);
        }
        return a.meta.enforcementOrder - b.meta.enforcementOrder;
    });
}
async function readConstraintFiles(dirPath) {
    try {
        const entries = await readdir(dirPath, { withFileTypes: true });
        return entries
            .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
            .map((entry) => path.join(dirPath, entry.name));
    }
    catch (error) {
        const nodeError = error;
        if (nodeError.code === "ENOENT") {
            return [];
        }
        throw error;
    }
}
export function partitionConstraints(documents) {
    const active = [];
    const disabled = [];
    for (const doc of documents) {
        if (doc.meta.isActive) {
            active.push(doc);
        }
        else {
            disabled.push(doc);
        }
    }
    return { active, disabled };
}
async function parseConstraintFile(filePath) {
    const rawContent = await readFile(filePath, "utf8");
    const sanitized = rawContent.replace(/^\uFEFF/, "");
    const { frontmatter, body } = extractFrontmatter(sanitized, filePath);
    const id = asString(frontmatter.id, "id", filePath);
    const name = asString(frontmatter.name, "name", filePath, id);
    const category = asString(frontmatter.category, "category", filePath, id);
    const severity = asString(frontmatter.severity, "severity", filePath, id);
    const enabled = asBoolean(frontmatter.enabled, "enabled", filePath, id, true);
    const optional = asBoolean(frontmatter.optional, "optional", filePath, id, false);
    const version = asNumber(frontmatter.version, "version", filePath, id);
    const group = asConstraintGroup(frontmatter.group, filePath, id);
    let quickTip;
    if (frontmatter.quick_tip !== undefined) {
        const parsedTip = asString(frontmatter.quick_tip, "quick_tip", filePath, id).trim();
        if (parsedTip.length === 0) {
            throw bundleError(id, `quick_tip in ${filePath} must be a non-empty string when provided.`);
        }
        quickTip = parsedTip;
    }
    let quickExample;
    if (frontmatter.quick_example !== undefined) {
        const parsedExample = asString(frontmatter.quick_example, "quick_example", filePath, id).trim();
        if (parsedExample.length === 0) {
            throw bundleError(id, `quick_example in ${filePath} must be a non-empty string when provided.`);
        }
        quickExample = parsedExample;
    }
    let checklistItem;
    if (frontmatter.checklist_item !== undefined) {
        const parsedChecklist = asString(frontmatter.checklist_item, "checklist_item", filePath, id).trim();
        if (parsedChecklist.length === 0) {
            throw bundleError(id, `checklist_item in ${filePath} must be a non-empty string when provided.`);
        }
        checklistItem = parsedChecklist;
    }
    const sections = extractSections(body, id, filePath);
    const headerFields = parseKeyValueBlock(sections.HEADER, id, filePath, "HEADER");
    const header = {
        constraintId: asString(headerFields.constraint_id, "constraint_id", filePath, id),
        severity: asString(headerFields.severity, "severity", filePath, id),
        enforcementOrder: asNumber(headerFields.enforcement_order, "enforcement_order", filePath, id),
    };
    if (header.constraintId !== id) {
        throw bundleError(id, `Frontmatter id '${id}' does not match HEADER constraint_id '${header.constraintId}'.`);
    }
    if (header.severity !== severity) {
        throw bundleError(id, `Frontmatter severity '${severity}' does not match HEADER severity '${header.severity}'.`);
    }
    if (severity !== "error") {
        throw bundleError(id, `Unsupported severity '${severity}' in ${filePath}; only 'error' allowed.`);
    }
    const meta = {
        id,
        name,
        category,
        severity: "error",
        enabled,
        optional,
        isActive: enabled,
        version,
        enforcementOrder: header.enforcementOrder,
        group,
        quick_tip: quickTip,
        quick_example: quickExample,
        checklist_item: checklistItem,
    };
    return {
        filePath,
        meta,
        header,
        sections,
    };
}
function extractFrontmatter(content, filePath) {
    const match = content.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n?([\s\S]*)$/);
    if (!match) {
        throw bundleError("global", `File ${filePath} is missing YAML frontmatter.`);
    }
    const [, frontmatterRaw, body] = match;
    const lines = frontmatterRaw.split(/\r?\n/);
    const data = {};
    for (let index = 0; index < lines.length; index += 1) {
        const rawLine = lines[index];
        if (!rawLine)
            continue;
        if (!rawLine.trim())
            continue;
        const separatorIndex = rawLine.indexOf(":");
        if (separatorIndex === -1) {
            throw bundleError("global", `Invalid frontmatter line '${rawLine.trim()}' in ${filePath}.`);
        }
        const key = rawLine.slice(0, separatorIndex).trim();
        if (!key) {
            throw bundleError("global", `Invalid frontmatter line '${rawLine.trim()}' in ${filePath}.`);
        }
        const rawValue = rawLine.slice(separatorIndex + 1).trim();
        if (rawValue === "|" || rawValue === "|+" || rawValue === "|-") {
            const blockLines = [];
            while (index + 1 < lines.length) {
                const nextLine = lines[index + 1];
                if (nextLine === undefined) {
                    break;
                }
                if (nextLine.trim() === "") {
                    blockLines.push("");
                    index += 1;
                    continue;
                }
                if (!/^\s/.test(nextLine)) {
                    break;
                }
                blockLines.push(nextLine);
                index += 1;
            }
            data[key] = normalizeBlockScalar(blockLines);
            continue;
        }
        data[key] = coerceScalar(rawValue);
    }
    return { frontmatter: data, body };
}
function normalizeBlockScalar(lines) {
    if (lines.length === 0) {
        return "";
    }
    const nonEmptyLines = lines.filter((line) => line.trim().length > 0);
    const indent = nonEmptyLines.length
        ? Math.min(...nonEmptyLines.map((line) => {
            const match = line.match(/^(\s+)/);
            return match ? match[1].length : 0;
        }))
        : 0;
    return lines
        .map((line) => {
        if (line.trim().length === 0) {
            return "";
        }
        return line.slice(indent);
    })
        .join("\n")
        .replace(/\r/g, "");
}
function extractSections(body, constraintId, filePath) {
    const sectionBuffers = new Map();
    let currentSection = null;
    let expectedIndex = 0;
    const lines = body.split(/\r?\n/);
    for (const line of lines) {
        const trimmed = line.trim();
        const foundIndex = CONSTRAINT_SECTION_ORDER.findIndex((section) => section === trimmed);
        if (foundIndex !== -1) {
            if (foundIndex !== expectedIndex) {
                throw bundleError(constraintId, `Section '${CONSTRAINT_SECTION_ORDER[expectedIndex]}' missing before '${trimmed}' in ${filePath}.`);
            }
            currentSection = CONSTRAINT_SECTION_ORDER[foundIndex];
            expectedIndex += 1;
            sectionBuffers.set(currentSection, []);
            continue;
        }
        if (currentSection === null) {
            if (trimmed.length === 0)
                continue;
            throw bundleError(constraintId, `Unexpected content before first section in ${filePath}: '${line}'`);
        }
        sectionBuffers.get(currentSection).push(line);
    }
    if (expectedIndex !== CONSTRAINT_SECTION_ORDER.length) {
        const missing = CONSTRAINT_SECTION_ORDER[expectedIndex];
        throw bundleError(constraintId, `Missing section '${missing}' in ${filePath}.`);
    }
    const sections = {};
    for (const sectionName of CONSTRAINT_SECTION_ORDER) {
        const buffer = sectionBuffers.get(sectionName);
        if (!buffer || buffer.length === 0) {
            throw bundleError(constraintId, `Section '${sectionName}' is empty in ${filePath}.`);
        }
        sections[sectionName] = buffer.join("\n").trim();
    }
    return sections;
}
function parseKeyValueBlock(block, constraintId, filePath, sectionLabel) {
    const lines = block.split(/\r?\n/);
    const data = {};
    for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line)
            continue;
        const [key, ...rest] = line.split(":");
        if (!key || rest.length === 0) {
            throw bundleError(constraintId, `Invalid key-value pair '${line}' in ${sectionLabel} (${filePath}).`);
        }
        data[key.trim()] = coerceScalar(rest.join(":").trim());
    }
    return data;
}
function coerceScalar(value) {
    if (/^\d+$/.test(value)) {
        return Number(value);
    }
    if (value === "true")
        return true;
    if (value === "false")
        return false;
    return value;
}
function asString(value, key, filePath, constraintId = "global") {
    if (typeof value === "string" && value.length > 0) {
        return value;
    }
    throw bundleError(constraintId, `Expected string '${key}' in ${filePath}.`);
}
function applyConstraintOverrides(documents, overrides) {
    if (!overrides || Object.keys(overrides).length === 0) {
        return documents;
    }
    const lookup = new Map(documents.map((doc) => [doc.meta.id, doc]));
    for (const [constraintId, override] of Object.entries(overrides)) {
        const target = lookup.get(constraintId);
        if (!target) {
            throw createError("CONFIG_ERROR", `constraint_overrides references unknown constraint '${constraintId}'.`);
        }
        if (typeof override.enabled !== "boolean") {
            throw createError("CONFIG_ERROR", `constraint_overrides.${constraintId}.enabled must be a boolean.`);
        }
        target.meta.isActive = override.enabled;
    }
    return documents;
}
function asBoolean(value, key, filePath, constraintId = "global", defaultValue) {
    if (typeof value === "boolean") {
        return value;
    }
    if (value === undefined && defaultValue !== undefined) {
        return defaultValue;
    }
    throw bundleError(constraintId, `Expected boolean '${key}' in ${filePath}.`);
}
function asNumber(value, key, filePath, constraintId = "global") {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }
    throw bundleError(constraintId, `Expected numeric '${key}' in ${filePath}.`);
}
function asConstraintGroup(value, filePath, constraintId = "global") {
    const group = asString(value, "group", filePath, constraintId);
    if (CONSTRAINT_GROUPS.includes(group)) {
        return group;
    }
    throw bundleError(constraintId, `Invalid group '${group}' in ${filePath}; expected one of: ${CONSTRAINT_GROUPS.join(", ")}.`);
}
function bundleError(constraintId, message) {
    return createError("BUNDLE_ERROR", `BUNDLE_ERROR [${constraintId}]: ${message}`);
}
