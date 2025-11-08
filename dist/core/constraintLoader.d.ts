import { ConstraintMeta } from "./types.js";
export declare const CONSTRAINT_SECTION_ORDER: readonly ["HEADER", "PURPOSE", "SCOPE", "DEFINITIONS", "FORBIDDEN", "ALLOWED", "REQUIRED DATA COLLECTION", "VALIDATION ALGORITHM (PSEUDOCODE)", "REPORTING CONTRACT", "FIX SEQUENCE (STRICT)", "REVALIDATION LOOP", "SUCCESS CRITERIA (MUST)", "FAILURE HANDLING", "COMMON MISTAKES", "POST-FIX ASSERTIONS", "FINAL REPORT SAMPLE"];
type SectionName = (typeof CONSTRAINT_SECTION_ORDER)[number];
export type ConstraintSections = Record<SectionName, string>;
export interface ConstraintHeader {
    constraintId: string;
    severity: string;
    enforcementOrder: number;
}
export interface ConstraintDocument {
    filePath: string;
    meta: ConstraintMeta;
    header: ConstraintHeader;
    sections: ConstraintSections;
}
export interface LoadConstraintsOptions {
    constraintsDir?: string;
}
export declare function loadConstraints(options?: LoadConstraintsOptions): Promise<ConstraintDocument[]>;
export {};
