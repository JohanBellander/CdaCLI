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
  it("loads the combined default bundle", async () => {
    const constraints = await loadConstraints();
    expect(constraints).toHaveLength(21);
    expect(constraints.map((c) => c.meta.id)).toEqual([
      "domain-no-imports-from-app-or-infra",
      "app-no-imports-from-infra",
      "domain-no-side-effects",
      "max-file-lines",
      "single-responsibility",
      "excessive-nesting",
      "file-naming",
      "folder-naming",
      "mvc-layer-separation",
      "mvp-presenter-boundaries",
      "mvvm-binding-integrity",
      "clean-layer-direction",
      "domain-purity",
      "ports-and-adapters-integrity",
      "central-config-entrypoint",
      "structural-naming-consistency",
      "module-complexity-guardrails",
      "ui-isolation",
      "api-boundary-hygiene",
      "observability-discipline",
      "test-coverage-contracts",
    ]);
  });

  it("loads constraints sorted by enforcement order", async () => {
    const constraints = await loadConstraints({
      constraintsDir: SOURCE_CONSTRAINTS,
    });
    expect(constraints).toHaveLength(21);
    expect(constraints.map((c) => c.meta.id)).toEqual([
      "domain-no-imports-from-app-or-infra",
      "app-no-imports-from-infra",
      "domain-no-side-effects",
      "max-file-lines",
      "single-responsibility",
      "excessive-nesting",
      "file-naming",
      "folder-naming",
      "mvc-layer-separation",
      "mvp-presenter-boundaries",
      "mvvm-binding-integrity",
      "clean-layer-direction",
      "domain-purity",
      "ports-and-adapters-integrity",
      "central-config-entrypoint",
      "structural-naming-consistency",
      "module-complexity-guardrails",
      "ui-isolation",
      "api-boundary-hygiene",
      "observability-discipline",
      "test-coverage-contracts",
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
      "mvc-layer-separation": [
        "constraint_id",
        "layer",
        "violation_type",
        "file_path",
        "line",
        "details",
      ],
      "mvp-presenter-boundaries": [
        "constraint_id",
        "layer",
        "violation_type",
        "file_path",
        "line",
        "details",
      ],
      "mvvm-binding-integrity": [
        "constraint_id",
        "layer",
        "violation_type",
        "file_path",
        "line",
        "details",
      ],
      "clean-layer-direction": [
        "constraint_id",
        "violation_type",
        "source_layer",
        "target_layer",
        "file_path",
        "line",
        "specifier",
      ],
      "domain-purity": [
        "constraint_id",
        "violation_type",
        "file_path",
        "line",
        "details",
      ],
      "ports-and-adapters-integrity": [
        "constraint_id",
        "violation_type",
        "file_path",
        "line",
        "details",
      ],
      "central-config-entrypoint": [
        "constraint_id",
        "violation_type",
        "file_path",
        "line",
        "details",
      ],
      "structural-naming-consistency": [
        "constraint_id",
        "violation_type",
        "layer",
        "folder_path",
        "details",
      ],
      "module-complexity-guardrails": [
        "constraint_id",
        "violation_type",
        "file_path",
        "line_start",
        "line_end",
        "observed_value",
        "threshold",
        "details",
      ],
      "ui-isolation": [
        "constraint_id",
        "violation_type",
        "file_path",
        "line",
        "details",
      ],
      "api-boundary-hygiene": [
        "constraint_id",
        "violation_type",
        "file_path",
        "line",
        "details",
      ],
      "observability-discipline": [
        "constraint_id",
        "violation_type",
        "file_path",
        "line",
        "details",
      ],
      "test-coverage-contracts": [
        "constraint_id",
        "violation_type",
        "file_path",
        "details",
      ],
    };

    pkg.constraints.forEach((block) => {
      expect(block.reportFields).toEqual(
        reportFieldExpectations[block.constraintId],
      );
    });

    expect(Object.keys(reportFieldExpectations)).toEqual(
      constraints.map((c) => c.meta.id),
    );
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
