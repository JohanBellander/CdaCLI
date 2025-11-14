import { describe, expect, it } from "vitest";

import {
  buildConfigConstraintState,
  computeConstraintOverridesFromState,
  type ConfigConstraintState,
} from "../src/core/configConstraintState.js";
import {
  CONSTRAINT_SECTION_ORDER,
  type ConstraintDocument,
  type ConstraintSections,
} from "../src/core/constraintLoader.js";
import type { ConstraintMeta } from "../src/core/types.js";

describe("buildConfigConstraintState", () => {
  it("returns bundle defaults when no overrides present", () => {
    const documents = [
      createConstraint({
        id: "mandatory-a",
        name: "Mandatory A",
        optional: false,
        enabled: true,
      }),
      createConstraint({
        id: "optional-b",
        name: "Optional B",
        optional: true,
        enabled: false,
      }),
    ];

    const state = buildConfigConstraintState(documents, {});

    expect(state).toEqual([
      {
        id: "mandatory-a",
        name: "Mandatory A",
        category: "category",
        optional: false,
        bundleEnabled: true,
        effectiveEnabled: true,
        toggleable: true,
      },
      {
        id: "optional-b",
        name: "Optional B",
        category: "category",
        optional: true,
        bundleEnabled: false,
        effectiveEnabled: false,
        toggleable: true,
      },
    ]);
  });

  it("applies overrides for effective state and re-enabled constraints", () => {
    const documents = [
      createConstraint({
        id: "optional-c",
        optional: true,
        enabled: false,
      }),
    ];

    const state = buildConfigConstraintState(documents, {
      "optional-c": { enabled: true },
    });

    expect(state[0]).toMatchObject({
      bundleEnabled: false,
      effectiveEnabled: true,
      toggleable: true,
    });
  });
});

describe("computeConstraintOverridesFromState", () => {
  it("returns minimal overrides for toggled optional constraints", () => {
    const documents = [
      createConstraint({
        id: "mandatory-a",
        optional: false,
        enabled: true,
      }),
      createConstraint({
        id: "optional-b",
        optional: true,
        enabled: true,
      }),
      createConstraint({
        id: "optional-c",
        optional: true,
        enabled: false,
      }),
    ];
    const state = buildConfigConstraintState(documents);

    const toggledState: ConfigConstraintState[] = state.map((entry) => {
      if (entry.id === "optional-b") {
        return { ...entry, effectiveEnabled: false };
      }
      if (entry.id === "optional-c") {
        return { ...entry, effectiveEnabled: true };
      }
      return entry;
    });

    const overrides = computeConstraintOverridesFromState(
      documents,
      toggledState,
    );

    expect(overrides).toEqual({
      "optional-b": { enabled: false },
      "optional-c": { enabled: true },
    });
  });

  it("removes overrides when state matches bundle defaults", () => {
    const documents = [
      createConstraint({
        id: "optional-b",
        optional: true,
        enabled: true,
      }),
    ];
    const state = buildConfigConstraintState(documents, {
      "optional-b": { enabled: false },
    });

    const reverted = state.map((entry) =>
      entry.id === "optional-b"
        ? { ...entry, effectiveEnabled: true }
        : entry,
    );

    const overrides = computeConstraintOverridesFromState(
      documents,
      reverted,
    );

    expect(overrides).toEqual({});
  });

  it("rejects unknown constraint IDs in updated state", () => {
    const documents = [
      createConstraint({
        id: "known",
        optional: true,
        enabled: true,
      }),
    ];
    const state: ConfigConstraintState[] = [
      ...buildConfigConstraintState(documents),
      {
        id: "unknown",
        name: "Unknown",
        category: "category",
        optional: true,
        bundleEnabled: true,
        effectiveEnabled: false,
        toggleable: true,
      },
    ];

    expect(() =>
      computeConstraintOverridesFromState(documents, state),
    ).toThrow(/unknown constraint 'unknown'/);
  });

  it("rejects duplicate constraint IDs in updated state", () => {
    const documents = [
      createConstraint({
        id: "known",
        optional: true,
        enabled: true,
      }),
    ];
    const baseState = buildConfigConstraintState(documents)[0];
    const state: ConfigConstraintState[] = [
      baseState,
      { ...baseState },
    ];

    expect(() =>
      computeConstraintOverridesFromState(documents, state),
    ).toThrow(/appears multiple times/);
  });

  it("allows disabling and re-enabling formerly mandatory constraints", () => {
    const documents = [
      createConstraint({
        id: "mandatory-a",
        optional: false,
        enabled: true,
      }),
    ];
    const state = buildConfigConstraintState(documents);
    const disabledState = state.map((entry) =>
      entry.id === "mandatory-a"
        ? { ...entry, effectiveEnabled: false }
        : entry,
    );

    const overrides = computeConstraintOverridesFromState(
      documents,
      disabledState,
    );
    expect(overrides).toEqual({
      "mandatory-a": { enabled: false },
    });
  });
});

function createConstraint(
  overrides: Partial<ConstraintMeta> & { id: string },
): ConstraintDocument {
  const meta: ConstraintMeta = {
    id: overrides.id,
    name: overrides.name ?? overrides.id,
    category: overrides.category ?? "category",
    severity: "error",
    enabled: overrides.enabled ?? true,
    optional: overrides.optional ?? false,
    isActive: overrides.isActive ?? overrides.enabled ?? true,
    version: overrides.version ?? 1,
    enforcementOrder: overrides.enforcementOrder ?? 1,
  };

  return {
    filePath: `${meta.id}.md`,
    meta,
    header: {
      constraintId: meta.id,
      severity: "error",
      enforcementOrder: meta.enforcementOrder,
    },
    sections: STUB_SECTIONS,
  };
}

const STUB_SECTIONS: ConstraintSections = CONSTRAINT_SECTION_ORDER.reduce(
  (acc, section) => {
    acc[section] = `${section} content`;
    return acc;
  },
  {} as ConstraintSections,
);
