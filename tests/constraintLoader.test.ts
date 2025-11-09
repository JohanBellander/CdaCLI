import path from "node:path";

import { describe, expect, it } from "vitest";

import { loadConstraints } from "../src/core/constraintLoader.js";
import { buildBatchInstructionPackage } from "../src/core/instructionEmitter.js";

const SOURCE_CONSTRAINTS = path.resolve("src/constraints/core");
const MALFORMED_DIR = path.resolve(
  "tests/fixtures/malformed-missing-section",
);
const OPTIONAL_DIR = path.resolve("tests/fixtures/optional-constraints");

describe("constraintLoader", () => {
  it("loads constraints sorted by enforcement order", async () => {
    const constraints = await loadConstraints({
      constraintsDir: SOURCE_CONSTRAINTS,
    });
    expect(constraints).toHaveLength(8);
    expect(constraints.map((c) => c.meta.id)).toEqual([
      "domain-no-imports-from-app-or-infra",
      "app-no-imports-from-infra",
      "domain-no-side-effects",
      "max-file-lines",
      "single-responsibility",
      "excessive-nesting",
      "file-naming",
      "folder-naming",
    ]);
  });

  it("throws a bundle error when a section is missing", async () => {
    await expect(
      loadConstraints({ constraintsDir: MALFORMED_DIR }),
    ).rejects.toThrow(/BUNDLE_ERROR \[test-bad]/);
  });

  it("keeps report_fields synchronized with markdown declarations", async () => {
    const constraints = await loadConstraints({
      constraintsDir: SOURCE_CONSTRAINTS,
    });
    const pkg = buildBatchInstructionPackage({
      runId: "test",
      constraints,
    });
    const reportFieldExpectations: Record<string, string[]> = {
      "domain-no-imports-from-app-or-infra": [
        "constraint_id",
        "file_path",
        "line",
        "specifier",
        "resolved_layer",
      ],
      "app-no-imports-from-infra": [
        "constraint_id",
        "file_path",
        "line",
        "specifier",
        "resolved_layer",
      ],
      "domain-no-side-effects": [
        "constraint_id",
        "file_path",
        "line",
        "expression",
        "reason",
      ],
      "max-file-lines": [
        "constraint_id",
        "file_path",
        "line_start",
        "line_end",
        "logical_line_count",
      ],
      "single-responsibility": [
        "constraint_id",
        "file_path",
        "export_count",
        "primary_category",
        "extra_exports",
      ],
      "excessive-nesting": [
        "constraint_id",
        "file_path",
        "function_name",
        "max_nesting",
        "line_start",
        "line_end",
      ],
      "file-naming": [
        "constraint_id",
        "file_path",
        "actual_name",
        "expected_pattern",
        "reason",
      ],
      "folder-naming": [
        "constraint_id",
        "folder_path",
        "actual_name",
        "expected_pattern",
      ],
    };

    pkg.constraints.forEach((block) => {
      expect(block.reportFields).toEqual(
        reportFieldExpectations[block.constraintId],
      );
    });
  });

  it("defaults optional flag to false when frontmatter omits it", async () => {
    const constraints = await loadConstraints({
      constraintsDir: OPTIONAL_DIR,
    });
    const mandatory = constraints.find(
      (doc) => doc.meta.id === "mandatory-default",
    );
    expect(mandatory).toBeDefined();
    expect(mandatory?.meta.optional).toBe(false);
    expect(mandatory?.meta.isActive).toBe(true);
  });

  it("applies overrides that enable bundled disabled constraints", async () => {
    const baseline = await loadConstraints({ constraintsDir: OPTIONAL_DIR });
    const defaultDisabled = baseline.find(
      (doc) => doc.meta.id === "optional-disabled",
    );
    expect(defaultDisabled?.meta.isActive).toBe(false);

    const merged = await loadConstraints({
      constraintsDir: OPTIONAL_DIR,
      constraintOverrides: {
        "optional-disabled": { enabled: true },
      },
    });
    const activated = merged.find(
      (doc) => doc.meta.id === "optional-disabled",
    );
    expect(activated?.meta.isActive).toBe(true);
  });

  it("allows disabling any constraint via overrides", async () => {
    const merged = await loadConstraints({
      constraintsDir: OPTIONAL_DIR,
      constraintOverrides: {
        "mandatory-default": { enabled: false },
      },
    });
    const disabled = merged.find(
      (doc) => doc.meta.id === "mandatory-default",
    );
    expect(disabled?.meta.isActive).toBe(false);
  });
});
