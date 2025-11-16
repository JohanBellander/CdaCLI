// Beads: CDATool-xfm CDATool-0xi CDATool-gnl CDATool-0nz CDATool-80h
import { INSTRUCTION_FORMAT_VERSION } from "./instructionFormat.js";
const BANNER = "AGENT VERIFICATION MODE: PROMPT INTENDED FOR AUTOMATED EXECUTION";
const PROMPT_HEADER = "### CDA VERIFICATION PROMPT (DO NOT ASSUME COMPLIANCE)";
const TOKEN_ESTIMATE_METHOD = "heuristic_chars_div_4";
const DIRECTIVE_BLOCK = [
    "AGENT DIRECTIVE:",
    "1. DETECTION ONLY MODE: You MUST execute ONLY the detection steps for each constraint. DO NOT perform any remediation, fixes, or code modifications.",
    "2. NO SHELL COMMANDS: You MUST NOT use shell execution, terminal commands, or scripts (PowerShell, bash, cmd, node -e, etc.). Use ONLY your built-in file reading tools (read_file, list_dir). Read file contents with read_file and analyze them directly in your reasoning. Count lines by reading the file and processing the content yourself.",
    "3. You MUST populate the EXPECTED AGENT REPORT FORMAT exactly as provided, preserving ordering and required keys.",
    "4. Report all violations found in the 'violations' array. Leave 'fixes_applied' as an empty array.",
    "5. Set execution_state to 'validated' if detection completed successfully, regardless of whether violations were found.",
    "6. You MUST report all detected violations; do not omit them or attempt to fix them.",
];
/**
 * Generate a formatted quick tips section from enabled constraints that define quick_tip copy.
 */
export function buildQuickTipsSection(enabledConstraints) {
    const tips = enabledConstraints
        .map((doc) => doc.meta.quick_tip?.trim())
        .filter((tip) => Boolean(tip));
    if (tips.length === 0) {
        return "";
    }
    const lines = [];
    lines.push("");
    lines.push("===== COMMON FIRST-RUN PITFALLS =====");
    lines.push("");
    lines.push("Based on your active constraints, avoid these common mistakes:");
    lines.push("");
    lines.push(...tips.map((tip) => `- ${tip}`));
    lines.push("");
    lines.push("===== END PITFALLS =====");
    lines.push("");
    return lines.join("\n");
}
/**
 * Generate concrete examples section from enabled constraints that define quick_example copy.
 */
export function buildPatternExamplesSection(enabledConstraints) {
    const examples = enabledConstraints
        .map((doc) => {
        const example = doc.meta.quick_example?.trim();
        if (!example)
            return undefined;
        return [`[${doc.meta.id}]`, example, ""].join("\n");
    })
        .filter((entry) => Boolean(entry));
    if (examples.length === 0) {
        return "";
    }
    const lines = [];
    lines.push("");
    lines.push("===== PATTERN EXAMPLES (Concrete Implementation) =====");
    lines.push("");
    lines.push(...examples);
    lines.push("===== END PATTERN EXAMPLES =====");
    lines.push("");
    return lines.join("\n");
}
/**
 * Generate architecture checklist from constraints that define checklist_item copy.
 */
export function buildArchitectureChecklist(enabledConstraints) {
    const items = enabledConstraints
        .map((doc) => {
        const checklist = doc.meta.checklist_item?.trim();
        if (!checklist)
            return undefined;
        return `? ${checklist}\n  -> Constraint: ${doc.meta.id}`;
    })
        .filter((entry) => Boolean(entry));
    if (items.length === 0) {
        return "";
    }
    const lines = [];
    lines.push("");
    lines.push("===== ARCHITECTURE CHECKLIST (Review Before Coding) =====");
    lines.push("");
    lines.push("Your active constraints require understanding these patterns.");
    lines.push("Can you answer YES to each question?");
    lines.push("");
    lines.push(...items);
    lines.push("");
    lines.push("If you answered NO to any question, review the examples above.");
    lines.push("");
    lines.push("===== END CHECKLIST =====");
    lines.push("");
    return lines.join("\n");
}
/**
 * Provide static implementation order guidance to keep work flowing top-down.
 */
export function buildImplementationOrderSection() {
    const lines = [];
    lines.push("");
    lines.push("===== RECOMMENDED IMPLEMENTATION ORDER =====");
    lines.push("");
    lines.push("To minimize violations, build the architecture layer-by-layer.");
    lines.push("Run `cda run --exec` after each phase to catch issues early.");
    lines.push("");
    lines.push("Phase 1: FOUNDATION (Infrastructure Setup)");
    lines.push("  Files to create first:");
    lines.push("    - packages/shared-types/schemas/*.ts (Zod schemas only)");
    lines.push("    - infra/config/index.ts (export getConfig())");
    lines.push("    - infra/telemetry/logger.ts (logging adapter)");
    lines.push("");
    lines.push("  Checkpoint: Run `cda run --exec` -> Expect 0 violations");
    lines.push("");
    lines.push("Phase 2: DOMAIN (Pure Business Logic)");
    lines.push("  Files to create:");
    lines.push("    - domain/{feature}/{entity}.ts (plain classes/interfaces)");
    lines.push("    - domain/{feature}/{entity}-repository.ts (ports)");
    lines.push("    - domain/{feature}/{entity}.test.ts (in the same directory)");
    lines.push("");
    lines.push("  Rules:");
    lines.push("    - No imports from app/infra/ui");
    lines.push("    - No framework imports (no Zod, ORMs, or HTTP libraries)");
    lines.push("    - Only TypeScript standard library");
    lines.push("");
    lines.push("  Checkpoint: Run `cda run --exec` -> Expect 0-2 violations");
    lines.push("");
    lines.push("Phase 3: INFRASTRUCTURE (Adapters & Implementation)");
    lines.push("  Files to create:");
    lines.push("    - infra/{feature}/{entity}-repository-impl.ts (implements ports)");
    lines.push("    - infra/{feature}/{entity}-dto.ts (toDto/fromDto mappers)");
    lines.push("    - infra/{feature}/*.test.ts");
    lines.push("");
    lines.push("  Rules:");
    lines.push("    - Can import from domain (implementing ports)");
    lines.push("    - Can use frameworks (Prisma, Axios, etc.)");
    lines.push("    - Keep files under 3 exports");
    lines.push("");
    lines.push("  Checkpoint: Run `cda run --exec` -> Expect 0-5 violations");
    lines.push("");
    lines.push("Phase 4: APPLICATION (Use Cases & Services)");
    lines.push("  Files to create:");
    lines.push("    - app/{feature}/{entity}-service.ts (orchestrate domain + infra)");
    lines.push("    - app/{feature}/{entity}-service.test.ts");
    lines.push("");
    lines.push("  Rules:");
    lines.push("    - Import from domain and infra");
    lines.push("    - Use logger from infra/telemetry");
    lines.push("    - Use getConfig() for configuration");
    lines.push("");
    lines.push("  Checkpoint: Run `cda run --exec` -> Expect 0-8 violations");
    lines.push("");
    lines.push("Phase 5: PRESENTATION (API Routes / UI Components)");
    lines.push("  Files to create:");
    lines.push("    - API: apps/api/src/routes/{feature}.ts");
    lines.push("    - Web: apps/web/src/components/{Feature}*.tsx");
    lines.push("");
    lines.push("  Rules:");
    lines.push("    - Call app services");
    lines.push("    - Use DTOs from infra");
    lines.push("    - Validate with Zod schemas from packages/shared-types");
    lines.push("");
    lines.push("  Final validation: Run `cda run --exec` -> Target <12 violations");
    lines.push("");
    lines.push("===== END IMPLEMENTATION ORDER =====");
    lines.push("");
    return lines.join("\n");
}
export function assemblePrompt(options) {
    const { runId, instructionText, agentName, promptPreamble, postscript, legacyFormat = false, disabledConstraints = [], enabledConstraints = [], } = options;
    const instructionFormatVersion = options.instructionFormatVersion ?? INSTRUCTION_FORMAT_VERSION;
    const generatedAt = (options.generatedAt ?? new Date()).toISOString();
    const lines = [];
    if (!legacyFormat) {
        lines.push(BANNER);
        lines.push(PROMPT_HEADER);
        lines.push(`run_id: ${runId}`);
        lines.push(`generated_at: ${generatedAt}`);
        lines.push(`instruction_format_version: ${instructionFormatVersion}`);
        lines.push(`agent_name: ${agentName}`);
        if (options.agentModel) {
            lines.push(`agent_model: ${options.agentModel}`);
        }
        lines.push(`token_estimate_method: ${TOKEN_ESTIMATE_METHOD}`);
        lines.push(disabledConstraints.length > 0
            ? `disabled_constraints: [${disabledConstraints.join(", ")}]`
            : "disabled_constraints: []");
        lines.push("");
    }
    if (promptPreamble) {
        lines.push(promptPreamble);
        lines.push("");
    }
    lines.push(instructionText);
    if (!legacyFormat) {
        const quickTipsSection = buildQuickTipsSection(enabledConstraints);
        if (quickTipsSection) {
            lines.push(quickTipsSection);
        }
        const patternExamplesSection = buildPatternExamplesSection(enabledConstraints);
        if (patternExamplesSection) {
            lines.push(patternExamplesSection);
        }
        const architectureChecklist = buildArchitectureChecklist(enabledConstraints);
        if (architectureChecklist) {
            lines.push(architectureChecklist);
        }
        const implementationOrder = buildImplementationOrderSection();
        if (implementationOrder) {
            lines.push(implementationOrder);
        }
    }
    if (!legacyFormat) {
        lines.push("");
        lines.push(...DIRECTIVE_BLOCK);
    }
    if (postscript) {
        lines.push("");
        lines.push(postscript);
    }
    let promptBody = lines.join("\n").trimEnd();
    if (!legacyFormat) {
        const charCount = promptBody.length;
        const approxTokenLength = Math.max(0, Math.floor(charCount / 4));
        promptBody = `${promptBody}\n\noriginal_char_count: ${charCount}\napprox_token_length: ${approxTokenLength}`;
        return {
            prompt: promptBody,
            charCount,
            approxTokenLength,
        };
    }
    const legacyLength = promptBody.length;
    return {
        prompt: promptBody,
        charCount: legacyLength,
        approxTokenLength: Math.max(0, Math.floor(legacyLength / 4)),
    };
}
