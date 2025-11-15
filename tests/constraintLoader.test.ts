import path from "node:path";

import { describe, expect, it } from "vitest";

import { loadConstraints } from "../src/core/constraintLoader.js";
import { buildBatchInstructionPackage } from "../src/core/instructionEmitter.js";
import { CONSTRAINT_GROUPS } from "../src/core/types.js";

const SOURCE_CONSTRAINTS = path.resolve("src/constraints/core");
const MALFORMED_DIR = path.resolve(
  "tests/fixtures/malformed-missing-section",
);
const OPTIONAL_DIR = path.resolve("tests/fixtures/optional-constraints");

describe("constraintLoader", () => {
  it("loads the combined default bundle", async () => {
    const constraints = await loadConstraints();
    expect(constraints).toHaveLength(29);
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
      "fastify-http-server",
      "zod-contracts",
      "prisma-data-access",
      "nextjs-app-structure",
      "react-ui-only",
      "tanstack-query-async",
      "axios-client-only",
      "shared-types-zod-source-of-truth",
    ]);
  });

  it("loads constraints sorted by enforcement order", async () => {
    const constraints = await loadConstraints({
      constraintsDir: SOURCE_CONSTRAINTS,
    });
    expect(constraints).toHaveLength(29);
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
      "fastify-http-server",
      "zod-contracts",
      "prisma-data-access",
      "nextjs-app-structure",
      "react-ui-only",
      "tanstack-query-async",
      "axios-client-only",
      "shared-types-zod-source-of-truth",
    ]);
  });

  it("requires every constraint to declare a non-empty id, name, and valid group", async () => {
    const constraints = await loadConstraints({
      constraintsDir: SOURCE_CONSTRAINTS,
    });
    const allowedGroups = new Set(CONSTRAINT_GROUPS);
    const missingMeta = constraints.filter(
      (doc) => !doc.meta.id.trim() || !doc.meta.name.trim(),
    );
    expect(missingMeta, "constraints missing id or name").toEqual([]);

    const invalidGroups = constraints
      .filter((doc) => !allowedGroups.has(doc.meta.group))
      .map((doc) => ({ id: doc.meta.id, group: doc.meta.group }));
    expect(invalidGroups, "constraints missing valid group").toEqual([]);
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
      "fastify-http-server": [
        "constraint_id",
        "violation_type",
        "file_path",
        "line",
        "specifier",
      ],
      "zod-contracts": [
        "constraint_id",
        "violation_type",
        "file_path",
        "line",
        "specifier",
        "referenced_schema",
      ],
      "prisma-data-access": [
        "constraint_id",
        "violation_type",
        "file_path",
        "line",
        "layer",
      ],
      "nextjs-app-structure": [
        "constraint_id",
        "violation_type",
        "file_path",
        "line",
        "details",
      ],
      "react-ui-only": [
        "constraint_id",
        "violation_type",
        "file_path",
        "line",
        "specifier",
      ],
      "tanstack-query-async": [
        "constraint_id",
        "violation_type",
        "file_path",
        "line",
        "specifier",
      ],
      "axios-client-only": [
        "constraint_id",
        "violation_type",
        "file_path",
        "line",
        "specifier",
      ],
      "shared-types-zod-source-of-truth": [
        "constraint_id",
        "violation_type",
        "file_path",
        "schema",
        "line",
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

  it("disables MVC and MVP by default, respects overrides", async () => {
    // Load default constraints
    const defaults = await loadConstraints();
    
    const mvc = defaults.find((doc) => doc.meta.id === "mvc-layer-separation");
    const mvp = defaults.find((doc) => doc.meta.id === "mvp-presenter-boundaries");
    const mvvm = defaults.find((doc) => doc.meta.id === "mvvm-binding-integrity");
    
    // MVC and MVP should be disabled by default
    expect(mvc?.meta.isActive).toBe(false);
    expect(mvp?.meta.isActive).toBe(false);
    // MVVM is also disabled by default in the React/Next profile
    expect(mvvm?.meta.isActive).toBe(false);
    
    // Can be enabled via overrides
    const withMvcEnabled = await loadConstraints({
      constraintOverrides: {
        "mvc-layer-separation": { enabled: true },
      },
    });
    const mvcEnabled = withMvcEnabled.find((doc) => doc.meta.id === "mvc-layer-separation");
    expect(mvcEnabled?.meta.isActive).toBe(true);
    
    // MVVM can be enabled/disabled via overrides
    const withMvvmEnabled = await loadConstraints({
      constraintOverrides: {
        "mvvm-binding-integrity": { enabled: true },
      },
    });
    const mvvmEnabled = withMvvmEnabled.find((doc) => doc.meta.id === "mvvm-binding-integrity");
    expect(mvvmEnabled?.meta.isActive).toBe(true);

    const withMvvmDisabled = await loadConstraints({
      constraintOverrides: {
        "mvvm-binding-integrity": { enabled: false },
      },
    });
    const mvvmDisabled = withMvvmDisabled.find((doc) => doc.meta.id === "mvvm-binding-integrity");
    expect(mvvmDisabled?.meta.isActive).toBe(false);
  });
});
