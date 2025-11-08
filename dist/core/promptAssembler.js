// Beads: CDATool-xfm CDATool-0xi CDATool-gnl CDATool-0nz CDATool-80h
import { INSTRUCTION_FORMAT_VERSION } from "./instructionFormat.js";
const BANNER = "AGENT VERIFICATION MODE: PROMPT INTENDED FOR AUTOMATED EXECUTION";
const PROMPT_HEADER = "### CDA VERIFICATION PROMPT (DO NOT ASSUME COMPLIANCE)";
const TOKEN_ESTIMATE_METHOD = "heuristic_chars_div_4";
const DIRECTIVE_BLOCK = [
    "AGENT DIRECTIVE:",
    "1. You MUST execute every detection and remediation step for each constraint block before responding.",
    "2. You MUST populate the EXPECTED AGENT REPORT FORMAT exactly as provided, preserving ordering and required keys.",
    "3. You MUST NOT declare validation success until you have rerun detection and satisfied all success_conditions; otherwise set execution_state: failed.",
    "4. You MUST report disputed or remaining violations instead of omitting them and explain any incomplete work.",
];
export function assemblePrompt(options) {
    const { runId, instructionText, agentName, promptPreamble, postscript, legacyFormat = false, } = options;
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
