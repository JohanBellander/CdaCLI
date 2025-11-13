import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { ConstraintMeta, ConstraintOverrides } from "./types.js";
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
] as const;

type SectionName = (typeof CONSTRAINT_SECTION_ORDER)[number];

export type ConstraintSections = Record<SectionName, string>;

export interface ConstraintHeader {
  constraintId: string;
  severity: string;
  enforcementOrder: number;
}

export interface ConstraintDocument {
  filePath: string;
  meta: ConstraintMeta;
  header: ConstraintHeader;
  sections: ConstraintSections;
}

export interface LoadConstraintsOptions {
  constraintsDir?: string;
  constraintOverrides?: ConstraintOverrides;
}

const DEFAULT_CONSTRAINT_DIRS = [
  fileURLToPath(new URL("../constraints/core", import.meta.url)),
];

export async function loadConstraints(
  options: LoadConstraintsOptions = {},
): Promise<ConstraintDocument[]> {
  const directories = options.constraintsDir
    ? [options.constraintsDir]
    : DEFAULT_CONSTRAINT_DIRS;

  const filesByDir = await Promise.all(
    directories.map((dir) => readConstraintFiles(dir)),
  );
  const files = filesByDir.flat();

  if (files.length === 0) {
    throw bundleError("global", "No constraint markdown files found.");
  }

  const documents = await Promise.all(
    files.map((filePath) => parseConstraintFile(filePath)),
  );

  const merged = applyConstraintOverrides(
    documents,
    options.constraintOverrides,
  );

  return merged.sort((a, b) => {
    if (a.meta.enforcementOrder === b.meta.enforcementOrder) {
      return a.meta.id.localeCompare(b.meta.id);
    }
    return a.meta.enforcementOrder - b.meta.enforcementOrder;
  });
}

async function readConstraintFiles(dirPath: string): Promise<string[]> {
  try {
    const entries = await readdir(dirPath, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
      .map((entry) => path.join(dirPath, entry.name));
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

export function partitionConstraints(
  documents: ConstraintDocument[],
): {
  active: ConstraintDocument[];
  disabled: ConstraintDocument[];
} {
  const active: ConstraintDocument[] = [];
  const disabled: ConstraintDocument[] = [];
  for (const doc of documents) {
    if (doc.meta.isActive) {
      active.push(doc);
    } else {
      disabled.push(doc);
    }
  }
  return { active, disabled };
}

async function parseConstraintFile(filePath: string): Promise<ConstraintDocument> {
  const rawContent = await readFile(filePath, "utf8");
  const sanitized = rawContent.replace(/^\uFEFF/, "");
  const { frontmatter, body } = extractFrontmatter(sanitized, filePath);

  const id = asString(frontmatter.id, "id", filePath);
  const name = asString(frontmatter.name, "name", filePath, id);
  const category = asString(frontmatter.category, "category", filePath, id);
  const severity = asString(frontmatter.severity, "severity", filePath, id);
  const enabled = asBoolean(
    frontmatter.enabled,
    "enabled",
    filePath,
    id,
    true,
  );
  const optional = asBoolean(
    frontmatter.optional,
    "optional",
    filePath,
    id,
    false,
  );
  const version = asNumber(frontmatter.version, "version", filePath, id);

  const sections = extractSections(body, id, filePath);
  const headerFields = parseKeyValueBlock(sections.HEADER, id, filePath, "HEADER");
  const header: ConstraintHeader = {
    constraintId: asString(headerFields.constraint_id, "constraint_id", filePath, id),
    severity: asString(headerFields.severity, "severity", filePath, id),
    enforcementOrder: asNumber(
      headerFields.enforcement_order,
      "enforcement_order",
      filePath,
      id,
    ),
  };

  if (header.constraintId !== id) {
    throw bundleError(
      id,
      `Frontmatter id '${id}' does not match HEADER constraint_id '${header.constraintId}'.`,
    );
  }

  if (header.severity !== severity) {
    throw bundleError(
      id,
      `Frontmatter severity '${severity}' does not match HEADER severity '${header.severity}'.`,
    );
  }

  if (severity !== "error") {
    throw bundleError(
      id,
      `Unsupported severity '${severity}' in ${filePath}; only 'error' allowed.`,
    );
  }

  const meta: ConstraintMeta = {
    id,
    name,
    category,
    severity: "error",
    enabled,
    optional,
    isActive: enabled,
    version,
    enforcementOrder: header.enforcementOrder,
  };

  return {
    filePath,
    meta,
    header,
    sections,
  };
}

function extractFrontmatter(
  content: string,
  filePath: string,
): { frontmatter: Record<string, unknown>; body: string } {
  const match = content.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n?([\s\S]*)$/);
  if (!match) {
    throw bundleError("global", `File ${filePath} is missing YAML frontmatter.`);
  }

  const [, frontmatterRaw, body] = match;
  const lines = frontmatterRaw.split(/\r?\n/);
  const data: Record<string, unknown> = {};

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    const [key, ...rest] = line.split(":");
    if (!key || rest.length === 0) {
      throw bundleError("global", `Invalid frontmatter line '${line}' in ${filePath}.`);
    }
    const rawValue = rest.join(":").trim();
    data[key.trim()] = coerceScalar(rawValue);
  }

  return { frontmatter: data, body };
}

function extractSections(
  body: string,
  constraintId: string,
  filePath: string,
): ConstraintSections {
  const sectionBuffers = new Map<SectionName, string[]>();
  let currentSection: SectionName | null = null;
  let expectedIndex = 0;

  const lines = body.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    const foundIndex = CONSTRAINT_SECTION_ORDER.findIndex((section) => section === trimmed);

    if (foundIndex !== -1) {
      if (foundIndex !== expectedIndex) {
        throw bundleError(
          constraintId,
          `Section '${CONSTRAINT_SECTION_ORDER[expectedIndex]}' missing before '${trimmed}' in ${filePath}.`,
        );
      }

      currentSection = CONSTRAINT_SECTION_ORDER[foundIndex];
      expectedIndex += 1;
      sectionBuffers.set(currentSection, []);
      continue;
    }

    if (currentSection === null) {
      if (trimmed.length === 0) continue;
      throw bundleError(
        constraintId,
        `Unexpected content before first section in ${filePath}: '${line}'`,
      );
    }

    sectionBuffers.get(currentSection)!.push(line);
  }

  if (expectedIndex !== CONSTRAINT_SECTION_ORDER.length) {
    const missing = CONSTRAINT_SECTION_ORDER[expectedIndex];
    throw bundleError(constraintId, `Missing section '${missing}' in ${filePath}.`);
  }

  const sections = {} as ConstraintSections;
  for (const sectionName of CONSTRAINT_SECTION_ORDER) {
    const buffer = sectionBuffers.get(sectionName);
    if (!buffer || buffer.length === 0) {
      throw bundleError(
        constraintId,
        `Section '${sectionName}' is empty in ${filePath}.`,
      );
    }
    sections[sectionName] = buffer.join("\n").trim();
  }

  return sections;
}

function parseKeyValueBlock(
  block: string,
  constraintId: string,
  filePath: string,
  sectionLabel: string,
): Record<string, unknown> {
  const lines = block.split(/\r?\n/);
  const data: Record<string, unknown> = {};

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    const [key, ...rest] = line.split(":");
    if (!key || rest.length === 0) {
      throw bundleError(
        constraintId,
        `Invalid key-value pair '${line}' in ${sectionLabel} (${filePath}).`,
      );
    }
    data[key.trim()] = coerceScalar(rest.join(":").trim());
  }

  return data;
}

function coerceScalar(value: string): unknown {
  if (/^\d+$/.test(value)) {
    return Number(value);
  }
  if (value === "true") return true;
  if (value === "false") return false;
  return value;
}

function asString(
  value: unknown,
  key: string,
  filePath: string,
  constraintId = "global",
): string {
  if (typeof value === "string" && value.length > 0) {
    return value;
  }
  throw bundleError(constraintId, `Expected string '${key}' in ${filePath}.`);
}

function applyConstraintOverrides(
  documents: ConstraintDocument[],
  overrides?: ConstraintOverrides,
): ConstraintDocument[] {
  if (!overrides || Object.keys(overrides).length === 0) {
    return documents;
  }

  const lookup = new Map(documents.map((doc) => [doc.meta.id, doc]));
  for (const [constraintId, override] of Object.entries(overrides)) {
    const target = lookup.get(constraintId);
    if (!target) {
      throw createError(
        "CONFIG_ERROR",
        `constraint_overrides references unknown constraint '${constraintId}'.`,
      );
    }

    if (typeof override.enabled !== "boolean") {
      throw createError(
        "CONFIG_ERROR",
        `constraint_overrides.${constraintId}.enabled must be a boolean.`,
      );
    }

    target.meta.isActive = override.enabled;
  }

  return documents;
}

function asBoolean(
  value: unknown,
  key: string,
  filePath: string,
  constraintId = "global",
  defaultValue?: boolean,
): boolean {
  if (typeof value === "boolean") {
    return value;
  }
  if (value === undefined && defaultValue !== undefined) {
    return defaultValue;
  }
  throw bundleError(constraintId, `Expected boolean '${key}' in ${filePath}.`);
}

function asNumber(
  value: unknown,
  key: string,
  filePath: string,
  constraintId = "global",
): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  throw bundleError(constraintId, `Expected numeric '${key}' in ${filePath}.`);
}

function bundleError(constraintId: string, message: string): Error {
  return createError(
    "BUNDLE_ERROR",
    `BUNDLE_ERROR [${constraintId}]: ${message}`,
  );
}
