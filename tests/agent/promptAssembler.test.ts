// Beads-Test: CDATool-xfm CDATool-0xi CDATool-gnl CDATool-0nz CDATool-80h

import { describe, expect, it } from "vitest";

import { assemblePrompt } from "../../src/core/promptAssembler.js";
import { INSTRUCTION_FORMAT_VERSION } from "../../src/core/instructionFormat.js";

const SAMPLE_INSTRUCTIONS = [
  "===== BEGIN CDA INSTRUCTIONS (TO EXECUTE) =====",
  "run_id: test-run",
  "mode: batch",
  "CONSTRAINT (INSTRUCTION ONLY - NO DETECTION YET): domain-no-imports-from-app-or-infra",
  "===== END CDA INSTRUCTIONS =====",
  "===== BEGIN EXPECTED AGENT REPORT FORMAT (FILL AFTER EXECUTION) =====",
  "report_kind: cda_validation_result",
  "===== END EXPECTED AGENT REPORT FORMAT =====",
].join("\n");

describe("promptAssembler", () => {
  it("assembles banner, metadata, directive block, and metrics", () => {
    const result = assemblePrompt({
      runId: "run-123",
      generatedAt: new Date("2025-11-08T09:00:00.000Z"),
      agentName: "copilot",
      agentModel: "gpt-5",
      instructionText: SAMPLE_INSTRUCTIONS,
      promptPreamble: "You are a verification agent.",
      postscript: "Return ONLY the populated EXPECTED AGENT REPORT FORMAT.",
    });

    expect(result.prompt).toContain(
      "AGENT VERIFICATION MODE: PROMPT INTENDED FOR AUTOMATED EXECUTION",
    );
    expect(result.prompt).toContain(
      "### CDA VERIFICATION PROMPT (DO NOT ASSUME COMPLIANCE)",
    );
    expect(result.prompt).toContain("run_id: run-123");
    expect(result.prompt).toContain(
      `instruction_format_version: ${INSTRUCTION_FORMAT_VERSION}`,
    );
    expect(result.prompt).toContain("agent_name: copilot");
    expect(result.prompt).toContain("agent_model: gpt-5");
    expect(result.prompt).toContain("token_estimate_method: heuristic_chars_div_4");
    expect(result.prompt).toContain("You are a verification agent.");
    expect(result.prompt).toContain(SAMPLE_INSTRUCTIONS);
    expect(result.prompt).toContain("AGENT DIRECTIVE:");
    expect(result.prompt).toContain(
      "You MUST populate the EXPECTED AGENT REPORT FORMAT exactly as provided",
    );
    expect(result.prompt).toContain(
      "Return ONLY the populated EXPECTED AGENT REPORT FORMAT.",
    );
    expect(result.prompt).toMatch(/original_char_count: \d+/);
    expect(result.prompt).toMatch(/approx_token_length: \d+/);
    expect(result.charCount).toBeGreaterThan(0);
    expect(result.approxTokenLength).toEqual(Math.floor(result.charCount / 4));
  });

  it("omits banner and metrics in legacy mode but keeps pre/postscript", () => {
    const result = assemblePrompt({
      runId: "run-legacy",
      generatedAt: new Date("2025-11-08T09:00:00.000Z"),
      agentName: "copilot",
      instructionText: SAMPLE_INSTRUCTIONS,
      promptPreamble: "Legacy preamble text.",
      postscript: "Legacy footer.",
      legacyFormat: true,
    });

    expect(result.prompt).not.toContain("AGENT VERIFICATION MODE");
    expect(result.prompt).not.toContain("token_estimate_method");
    expect(result.prompt).not.toContain("original_char_count");
    expect(result.prompt).not.toContain("approx_token_length");
    expect(result.prompt).toContain("Legacy preamble text.");
    expect(result.prompt).toContain("Legacy footer.");
    expect(result.prompt).toContain(SAMPLE_INSTRUCTIONS);
  });
});
