import { BatchInstructionPackage, SingleInstructionPackage } from "./types.js";
import { ConstraintDocument } from "./constraintLoader.js";
export declare const DEFAULT_IGNORED_PATHS: readonly ["node_modules", "dist", "build", ".git"];
export interface BatchPackageOptions {
    runId: string;
    constraints: ConstraintDocument[];
    ignoredPaths?: string[];
}
export interface SinglePackageOptions {
    runId: string;
    constraint: ConstraintDocument;
}
export declare function buildBatchInstructionPackage(options: BatchPackageOptions): BatchInstructionPackage;
export declare function buildSingleInstructionPackage(options: SinglePackageOptions): SingleInstructionPackage;
