import type { ConstraintDocument } from "./constraintLoader.js";
import type { ConstraintGroup, ConstraintOverrides } from "./types.js";
export interface ConfigConstraintState {
    id: string;
    name: string;
    category: string;
    group: ConstraintGroup;
    optional: boolean;
    bundleEnabled: boolean;
    effectiveEnabled: boolean;
    toggleable: boolean;
}
export declare function buildConfigConstraintState(documents: ConstraintDocument[], overrides?: ConstraintOverrides): ConfigConstraintState[];
export declare function computeConstraintOverridesFromState(documents: ConstraintDocument[], updatedState: ConfigConstraintState[]): ConstraintOverrides;
