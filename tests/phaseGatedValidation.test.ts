import { describe, expect, it } from "vitest";

import type { ConstraintMeta } from "../src/core/types.js";
import type { ConstraintDocument } from "../src/core/constraintLoader.js";
import {
  assertValidPhase,
  buildPhasePromptContext,
  filterConstraintsByPhase,
  formatPhaseWarnings,
  getConstraintsForPhase,
} from "../src/core/phaseUtils.js";

function createMeta(id: string, isActive = true): ConstraintMeta {
  return {
    id,
    name: id,
    category: "test",
    severity: "error",
    enabled: true,
    optional: false,
    isActive,
    version: 1,
    enforcementOrder: 1,
    group: "architecture",
  };
}

function createDoc(id: string, isActive = true): ConstraintDocument {
  return {
    filePath: `${id}.md`,
    meta: createMeta(id, isActive),
    header: {
      constraintId: id,
      severity: "error",
      enforcementOrder: 1,
    },
    sections: {} as any,
  };
}

describe("phase utils", () => {
  it("returns cumulative constraint metas for a phase", () => {
    const metas = [
      createMeta("central-config-entrypoint"),
      createMeta("observability-discipline"),
      createMeta("domain-purity"),
      createMeta("domain-no-side-effects", false),
    ];

    const result = getConstraintsForPhase("domain", metas);
    const ids = result.map((meta) => meta.id);
    expect(ids).toContain("central-config-entrypoint");
    expect(ids).toContain("observability-discipline");
    expect(ids).toContain("domain-purity");
    expect(ids).not.toContain("domain-no-side-effects");
  });

  it("validates and normalizes phase names", () => {
    expect(assertValidPhase("Foundation")).toBe("foundation");
    expect(() => assertValidPhase("unknown-phase")).toThrow(/Unknown phase/);
  });

  it("filters constraint documents by phase and reports warnings", () => {
    const allConstraints = [
      createDoc("central-config-entrypoint"),
      createDoc("structural-naming-consistency"),
      createDoc("observability-discipline", false),
      createDoc("domain-purity"),
    ];
    const { constraints, info, disabledConstraintIds, missingConstraintIds } =
      filterConstraintsByPhase({
        phase: "foundation",
        activeConstraints: allConstraints.filter((doc) => doc.meta.isActive),
        disabledConstraints: allConstraints.filter((doc) => !doc.meta.isActive),
        allConstraints,
      });

    expect(constraints.map((doc) => doc.meta.id)).toEqual([
      "central-config-entrypoint",
      "structural-naming-consistency",
    ]);
    expect(info.phaseNumber).toBe(1);
    expect(info.phaseDefinedCount).toBeGreaterThan(0);
    expect(info.cumulativeDefinedCount).toBeGreaterThan(info.phaseDefinedCount - 1);
    expect(disabledConstraintIds).toEqual(["observability-discipline"]);
    expect(missingConstraintIds).toContain("file-naming");

    const warnings = formatPhaseWarnings({
      constraints,
      info,
      disabledConstraintIds,
      missingConstraintIds,
    });
    expect(warnings.some((line) => line.includes("disabled constraint"))).toBe(true);
    expect(warnings.some((line) => line.includes("missing constraint"))).toBe(true);
  });

  it("throws when a phase resolves to zero active constraints", () => {
    const docs = [
      createDoc("central-config-entrypoint", false),
      createDoc("structural-naming-consistency", false),
    ];
    expect(() =>
      filterConstraintsByPhase({
        phase: "foundation",
        activeConstraints: docs.filter((doc) => doc.meta.isActive),
        disabledConstraints: docs.filter((doc) => !doc.meta.isActive),
        allConstraints: docs,
      }),
    ).toThrow(/no active constraints/i);
  });

  it("builds phase prompt context for banner rendering", () => {
    const docs = [
      createDoc("central-config-entrypoint"),
      createDoc("observability-discipline"),
      createDoc("domain-purity"),
    ];

    const result = filterConstraintsByPhase({
      phase: "domain",
      activeConstraints: docs,
      disabledConstraints: [],
      allConstraints: docs,
    });
    const context = buildPhasePromptContext(result.info);

    expect(context.metadata.phase_label).toBe("Phase 2: Domain Layer");
    expect(context.metadata.included_phases).toEqual(["foundation", "domain"]);
    expect(context.objectiveLines.join(" ")).toContain("business logic");
    expect(context.validationLines[0]).toContain("constraints");
    expect(context.contextLines.some((line) => line.includes("IN PROGRESS"))).toBe(
      true,
    );
    expect(context.keyPrinciples.length).toBeGreaterThan(0);
    expect(
      context.nextSteps.some((line) => line.includes("cda run --phase domain")),
    ).toBe(true);
  });
});
