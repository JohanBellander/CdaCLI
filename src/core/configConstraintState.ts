import { createError } from "./errors.js";
import type { ConstraintDocument } from "./constraintLoader.js";
import type { ConstraintOverrides } from "./types.js";

export interface ConfigConstraintState {
  id: string;
  name: string;
  category: string;
  optional: boolean;
  bundleEnabled: boolean;
  effectiveEnabled: boolean;
  toggleable: boolean;
}

export function buildConfigConstraintState(
  documents: ConstraintDocument[],
  overrides: ConstraintOverrides = {},
): ConfigConstraintState[] {
  return documents.map((doc) => {
    const bundleEnabled = doc.meta.enabled;
    const override = overrides[doc.meta.id];
    const effectiveEnabled =
      override && typeof override.enabled === "boolean"
        ? override.enabled
        : bundleEnabled;

    return {
      id: doc.meta.id,
      name: doc.meta.name,
      category: doc.meta.category,
      optional: doc.meta.optional,
      bundleEnabled,
      effectiveEnabled,
      toggleable: true,
    };
  });
}

export function computeConstraintOverridesFromState(
  documents: ConstraintDocument[],
  updatedState: ConfigConstraintState[],
): ConstraintOverrides {
  const lookup = new Map(documents.map((doc) => [doc.meta.id, doc]));
  const seen = new Set<string>();
  const overrides: ConstraintOverrides = {};

  for (const state of updatedState) {
    if (seen.has(state.id)) {
      throw createError(
        "CONFIG_ERROR",
        `Constraint '${state.id}' appears multiple times in config state.`,
      );
    }
    seen.add(state.id);

    const doc = lookup.get(state.id);
    if (!doc) {
      throw createError(
        "CONFIG_ERROR",
        `Constraint state references unknown constraint '${state.id}'.`,
      );
    }

    const bundleEnabled = doc.meta.enabled;
    if (state.effectiveEnabled !== bundleEnabled) {
      overrides[state.id] = { enabled: state.effectiveEnabled };
    }
  }

  return overrides;
}
