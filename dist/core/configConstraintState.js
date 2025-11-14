import { createError } from "./errors.js";
export function buildConfigConstraintState(documents, overrides = {}) {
    return documents.map((doc) => {
        const bundleEnabled = doc.meta.enabled;
        const override = overrides[doc.meta.id];
        const effectiveEnabled = override && typeof override.enabled === "boolean"
            ? override.enabled
            : bundleEnabled;
        return {
            id: doc.meta.id,
            name: doc.meta.name,
            category: doc.meta.category,
            optional: doc.meta.optional,
            bundleEnabled,
            effectiveEnabled,
            // In the future we may make some constraints non-toggleable, but for now
            // all bundled constraints can be switched on/off via config.
            toggleable: true,
        };
    });
}
export function computeConstraintOverridesFromState(documents, updatedState) {
    const lookup = new Map(documents.map((doc) => [doc.meta.id, doc]));
    const seen = new Set();
    const overrides = {};
    for (const state of updatedState) {
        if (seen.has(state.id)) {
            throw createError("CONFIG_ERROR", `Constraint '${state.id}' appears multiple times in config state.`);
        }
        seen.add(state.id);
        const doc = lookup.get(state.id);
        if (!doc) {
            throw createError("CONFIG_ERROR", `Constraint state references unknown constraint '${state.id}'.`);
        }
        const bundleEnabled = doc.meta.enabled;
        if (state.effectiveEnabled !== bundleEnabled) {
            overrides[state.id] = { enabled: state.effectiveEnabled };
        }
    }
    return overrides;
}
