import type { ConstraintOverrides } from "./types.js";
export declare const PROJECT_CONFIG_FILENAME = "cda.config.json";
export interface ProjectConfig {
    path: string;
    version: number;
    constraints: string;
    constraintOverrides: ConstraintOverrides;
}
interface LoadProjectConfigOptions {
    cwd?: string;
    required?: boolean;
}
export declare function loadProjectConfig(options?: LoadProjectConfigOptions): Promise<ProjectConfig | null>;
export {};
