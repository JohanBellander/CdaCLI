// Beads: CDATool-xfm CDATool-0xi CDATool-gnl CDATool-0nz CDATool-80h

import { INSTRUCTION_FORMAT_VERSION } from "./instructionFormat.js";

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
  "2. You MUST populate the EXPECTED AGENT REPORT FORMAT exactly as provided, preserving ordering and required keys.",
  "3. Report all violations found in the 'violations' array. Leave 'fixes_applied' as an empty array.",
  "4. Set execution_state to 'validated' if detection completed successfully, regardless of whether violations were found.",
  "5. You MUST report all detected violations; do not omit them or attempt to fix them.",
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
  } = options;
  const instructionFormatVersion =
    options.instructionFormatVersion ?? INSTRUCTION_FORMAT_VERSION;
  const generatedAt = (options.generatedAt ?? new Date()).toISOString();
  const lines: string[] = [];

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
    lines.push("");
  }

  if (promptPreamble) {
    lines.push(promptPreamble);
    lines.push("");
  }

  lines.push(instructionText);

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
