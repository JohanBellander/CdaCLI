import path from "node:path";

import { beforeAll, describe, expect, it } from "vitest";

import type { ConstraintDocument } from "../src/core/constraintLoader.js";
import { loadConstraints } from "../src/core/constraintLoader.js";
import {
  buildBatchInstructionPackage,
  buildSingleInstructionPackage,
} from "../src/core/instructionEmitter.js";
import {
  formatBatchInstructionPackage,
  formatLegacyBatchInstructionPackage,
  formatLegacySingleInstructionPackage,
  formatSingleInstructionPackage,
} from "../src/cli/formatters.js";

const CONSTRAINTS_DIR = path.resolve("src/constraints/core");

let cachedConstraints: ConstraintDocument[] = [];

beforeAll(async () => {
  cachedConstraints = await loadConstraints({ constraintsDir: CONSTRAINTS_DIR });
});

describe("CLI output format (spec update 1)", () => {
  it("includes banner disclaimers, version, and guidance blocks", () => {
    const pkg = buildBatchInstructionPackage({
      runId: "test-run",
      constraints: cachedConstraints,
    });
    const output = formatBatchInstructionPackage(pkg);

    expect(output).toContain("analysis_performed: false");
    expect(output).toContain("execution_state: unvalidated");
    expect(output).toContain("instruction_format_version: 2");
    expect(output).toContain("AGENT ACTION REQUIRED:");
    expect(output).toContain("DO NOT:");
  });

  it("renders sentinel markers exactly once per section (batch)", () => {
    const pkg = buildBatchInstructionPackage({
      runId: "test-run",
      constraints: cachedConstraints,
    });
    const output = formatBatchInstructionPackage(pkg);

    expect(countOccurrences(output, "===== BEGIN CDA INSTRUCTIONS (TO EXECUTE) =====")).toBe(
      1,
    );
    expect(countOccurrences(output, "===== END CDA INSTRUCTIONS =====")).toBe(1);
    expect(
      countOccurrences(
        output,
        "===== BEGIN EXPECTED AGENT REPORT FORMAT (FILL AFTER EXECUTION) =====",
      ),
    ).toBe(1);
    expect(
      countOccurrences(output, "===== END EXPECTED AGENT REPORT FORMAT ====="),
    ).toBe(1);
  });

  it("prints success_conditions and self_audit placeholders with defaults", () => {
    const pkg = buildBatchInstructionPackage({
      runId: "test-run",
      constraints: cachedConstraints,
    });
    const output = formatBatchInstructionPackage(pkg);

    expect(output).toContain("success_conditions:");
    expect(output).toContain("all_constraints_evaluated: false");
    expect(output).toContain("no_remaining_violations: false");
    expect(output).toContain("self_audit:");
    expect(output).toContain("all_constraints_present: false");
    expect(output).toContain("agent_execution_signature: null");
  });

  it("prefixes every constraint header with INSTRUCTION ONLY disclaimer", () => {
    const pkg = buildBatchInstructionPackage({
      runId: "test-run",
      constraints: cachedConstraints,
    });
    const output = formatBatchInstructionPackage(pkg);

    expect(output).toMatch(
      /CONSTRAINT \(INSTRUCTION ONLY - NO DETECTION YET\): domain-no-imports-from-app-or-infra/,
    );
  });

  it("single constraint output mirrors disclaimers and sentinel usage", () => {
    const pkg = buildSingleInstructionPackage({
      runId: "single-run",
      constraint: cachedConstraints[0],
    });
    const output = formatSingleInstructionPackage(pkg);

    expect(output).toContain("analysis_performed: false");
    expect(output).toContain("instruction_format_version: 2");
    expect(output).toMatch(
      /CONSTRAINT \(INSTRUCTION ONLY - NO DETECTION YET\): domain-no-imports-from-app-or-infra/,
    );
    expect(
      countOccurrences(output, "===== BEGIN CDA INSTRUCTIONS (TO EXECUTE) ====="),
    ).toBe(1);
    expect(
      countOccurrences(
        output,
        "===== BEGIN EXPECTED AGENT REPORT FORMAT (FILL AFTER EXECUTION) =====",
      ),
    ).toBe(1);
  });

  it("legacy format omits new banner-only decorations", () => {
    const batchPkg = buildBatchInstructionPackage({
      runId: "legacy-run",
      constraints: cachedConstraints,
    });
    const singlePkg = buildSingleInstructionPackage({
      runId: "legacy-single",
      constraint: cachedConstraints[0],
    });

    const batchOutput = formatLegacyBatchInstructionPackage(batchPkg);
    expect(batchOutput).not.toContain("instruction_format_version");
    expect(batchOutput).not.toContain("AGENT ACTION REQUIRED");
    expect(batchOutput).toContain("REPORT TEMPLATE");

    const singleOutput = formatLegacySingleInstructionPackage(singlePkg);
    expect(singleOutput).toContain("REPORT TEMPLATE");
    expect(singleOutput).not.toContain("AGENT ACTION REQUIRED");
  });
});

function countOccurrences(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}
