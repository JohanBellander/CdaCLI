// Beads: CDATool-xfm CDATool-0xi CDATool-gnl CDATool-0nz CDATool-80h

import { INSTRUCTION_FORMAT_VERSION } from "./instructionFormat.js";
import { PHASES, type Phase } from "./types.js";
import type { PhasePromptContext } from "./phaseUtils.js";

export interface PromptAssemblerOptions {
  runId: string;
  instructionFormatVersion?: number;
  generatedAt?: Date;
  agentName: string;
  agentModel?: string;
  instructionText: string;
  promptPreamble?: string;
  postscript?: string;
  legacyFormat?: boolean;
  disabledConstraints?: string[];
  phaseContext?: PhasePromptContext;
}

export interface PromptAssemblyResult {
  prompt: string;
  /**
   * Character count used for heuristic token calculations (excludes the metrics lines themselves).
   */
  charCount: number;
  approxTokenLength: number;
}

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

export function assemblePrompt(
  options: PromptAssemblerOptions,
): PromptAssemblyResult {
  const {
    runId,
    instructionText,
    agentName,
    promptPreamble,
    postscript,
    legacyFormat = false,
    disabledConstraints = [],
    phaseContext,
  } = options;
  const instructionFormatVersion =
    options.instructionFormatVersion ?? INSTRUCTION_FORMAT_VERSION;
  const generatedAt = (options.generatedAt ?? new Date()).toISOString();
  const lines: string[] = [];

  if (!legacyFormat) {
    lines.push(BANNER);
    if (phaseContext) {
      lines.push("========================================");
      lines.push(
        `CDA AGENT PROMPT - ${phaseContext.metadata.phase_label.toUpperCase()}`,
      );
      lines.push("========================================");
      lines.push("");
      lines.push(
        `Phase Mode: ${phaseContext.metadata.phase_mode} (Phase ${phaseContext.metadata.phase_number} of ${PHASES.length})`,
      );
      lines.push(
        `Included Phases: ${phaseContext.metadata.included_phases.join(", ")}`,
      );
      lines.push(
        formatConstraintLine(
          "Constraints in This Phase",
          phaseContext.metadata.constraints_in_phase,
          phaseContext.phaseActiveCount,
        ),
      );
      lines.push(
        formatConstraintLine(
          "Cumulative Constraints",
          phaseContext.metadata.cumulative_constraints,
          phaseContext.cumulativeActiveCount,
          formatPhaseRange(phaseContext.metadata.included_phases),
        ),
      );
      lines.push(
        phaseContext.metadata.next_phase
          ? `Next Phase: ${phaseContext.metadata.next_phase}`
          : "Next Phase: None (final presentation phase)",
      );
      lines.push("");
    } else {
      lines.push(PROMPT_HEADER);
    }
    lines.push(`run_id: ${runId}`);
    lines.push(`generated_at: ${generatedAt}`);
    lines.push(`instruction_format_version: ${instructionFormatVersion}`);
    lines.push(`agent_name: ${agentName}`);
    if (options.agentModel) {
      lines.push(`agent_model: ${options.agentModel}`);
    }
    lines.push(`token_estimate_method: ${TOKEN_ESTIMATE_METHOD}`);
    lines.push(
      disabledConstraints.length > 0
        ? `disabled_constraints: [${disabledConstraints.join(", ")}]`
        : "disabled_constraints: []",
    );
    lines.push("");
  }

  if (promptPreamble) {
    lines.push(promptPreamble);
    lines.push("");
  }

  if (phaseContext) {
    lines.push(`=== PHASE ${phaseContext.metadata.phase_number} OBJECTIVE ===`);
    lines.push(...phaseContext.objectiveLines);
    lines.push("");
    lines.push(...phaseContext.validationLines);
    lines.push("");
    lines.push("=== ARCHITECTURAL CONTEXT ===");
    lines.push(...phaseContext.contextLines);
    lines.push("");
    lines.push(
      `Key principles for ${phaseContext.metadata.phase_label}:`,
    );
    lines.push(...phaseContext.keyPrinciples);
    lines.push("");
  }

  lines.push(instructionText);

  if (phaseContext) {
    lines.push("");
    lines.push("=== NEXT STEPS ===");
    lines.push(...phaseContext.nextSteps);
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

function formatConstraintLine(
  label: string,
  definedCount: number,
  activeCount: number,
  suffix?: string,
): string {
  const base = `${label}: ${definedCount}`;
  const range = suffix ? ` (${suffix})` : "";
  const activeNote =
    activeCount === definedCount
      ? ""
      : ` (active: ${activeCount})`;
  return `${base}${range}${activeNote}`;
}

function formatPhaseRange(phases: Phase[]): string | undefined {
  if (phases.length === 0) {
    return undefined;
  }
  if (phases.length === 1) {
    const index = PHASES.indexOf(phases[0]);
    return `Phase ${index + 1}`;
  }
  const start = PHASES.indexOf(phases[0]) + 1;
  const end = PHASES.indexOf(phases[phases.length - 1]) + 1;
  return `Phase ${start}-${end}`;
}
