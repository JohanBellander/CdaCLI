// Beads-Test: CDATool-xfm CDATool-0xi CDATool-gnl CDATool-0nz CDATool-80h

import { describe, expect, it } from "vitest";

import {
  CONSTRAINT_SECTION_ORDER,
  type ConstraintDocument,
  type ConstraintSections,
} from "../../src/core/constraintLoader.js";
import { assemblePrompt, buildQuickTipsSection } from "../../src/core/promptAssembler.js";
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

describe("buildQuickTipsSection", () => {
  it("returns empty string when no quick tips are defined", () => {
    const section = buildQuickTipsSection([
      createConstraintDocument({ id: "domain-purity" }),
    ]);

    expect(section).toBe("");
  });

  it("renders bullets for every quick tip provided", () => {
    const section = buildQuickTipsSection([
      createConstraintDocument({
        id: "domain-purity",
        quick_tip: "Stay pure",
      }),
      createConstraintDocument({
        id: "shared-types",
        quick_tip: "Import from shared types",
      }),
    ]);

    expect(section).toContain("===== COMMON FIRST-RUN PITFALLS =====");
    expect(section).toContain("- Stay pure");
    expect(section).toContain("- Import from shared types");
  });

  it("skips constraints that do not define quick tips", () => {
    const section = buildQuickTipsSection([
      createConstraintDocument({
        id: "domain-purity",
        quick_tip: "Stay pure",
      }),
      createConstraintDocument({
        id: "no-tip",
      }),
    ]);

    const bulletLines = section
      .split("\n")
      .filter((line) => line.startsWith("- "));
    expect(bulletLines).toEqual(["- Stay pure"]);
  });

  it("wraps quick tips with sentinel markers and guidance text", () => {
    const section = buildQuickTipsSection([
      createConstraintDocument({
        id: "domain-purity",
        quick_tip: "Stay pure",
      }),
    ]);

    expect(section).toContain("===== COMMON FIRST-RUN PITFALLS =====");
    expect(section).toContain(
      "Based on your active constraints, avoid these common mistakes:",
    );
    expect(section).toContain("===== END PITFALLS =====");
    expect(section.endsWith("\n")).toBe(true);
  });
});

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
      enabledConstraints: [],
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
      enabledConstraints: [],
    });

    expect(result.prompt).not.toContain("AGENT VERIFICATION MODE");
    expect(result.prompt).not.toContain("token_estimate_method");
    expect(result.prompt).not.toContain("original_char_count");
    expect(result.prompt).not.toContain("approx_token_length");
    expect(result.prompt).toContain("Legacy preamble text.");
    expect(result.prompt).toContain("Legacy footer.");
    expect(result.prompt).toContain(SAMPLE_INSTRUCTIONS);
  });

  it("injects quick tips between the instruction package and directives", () => {
    const result = assemblePrompt({
      runId: "run-quick-tips",
      generatedAt: new Date("2025-11-08T09:00:00.000Z"),
      agentName: "copilot",
      instructionText: SAMPLE_INSTRUCTIONS,
      enabledConstraints: [
        createConstraintDocument({
          id: "domain-purity",
          quick_tip: "Stay pure",
        }),
      ],
    });

    const prompt = result.prompt;
    const instructionsIndex = prompt.indexOf(SAMPLE_INSTRUCTIONS);
    const tipsIndex = prompt.indexOf("===== COMMON FIRST-RUN PITFALLS =====");
    const directiveIndex = prompt.indexOf("AGENT DIRECTIVE:");

    expect(tipsIndex).toBeGreaterThan(instructionsIndex);
    expect(directiveIndex).toBeGreaterThan(tipsIndex);
    expect(prompt).toContain("- Stay pure");
  });

  it("omits quick tips when no enabled constraint defines them", () => {
    const result = assemblePrompt({
      runId: "run-no-tips",
      generatedAt: new Date("2025-11-08T09:00:00.000Z"),
      agentName: "copilot",
      instructionText: SAMPLE_INSTRUCTIONS,
      enabledConstraints: [
        createConstraintDocument({
          id: "no-tip",
        }),
      ],
    });

    expect(result.prompt).not.toContain("===== COMMON FIRST-RUN PITFALLS =====");
  });

  it("skips quick tips entirely for legacy format prompts", () => {
    const result = assemblePrompt({
      runId: "run-legacy-tips",
      generatedAt: new Date("2025-11-08T09:00:00.000Z"),
      agentName: "copilot",
      instructionText: SAMPLE_INSTRUCTIONS,
      legacyFormat: true,
      enabledConstraints: [
        createConstraintDocument({
          id: "domain-purity",
          quick_tip: "Stay pure",
        }),
      ],
    });

    expect(result.prompt).not.toContain("===== COMMON FIRST-RUN PITFALLS =====");
  });
});

function createConstraintDocument(
  overrides: Partial<ConstraintDocument["meta"]> & { id: string },
): ConstraintDocument {
  const meta: ConstraintDocument["meta"] = {
    id: overrides.id,
    name: overrides.name ?? overrides.id,
    category: overrides.category ?? "category",
    severity: "error",
    enabled: overrides.enabled ?? true,
    optional: overrides.optional ?? false,
    isActive: overrides.isActive ?? overrides.enabled ?? true,
    version: overrides.version ?? 1,
    enforcementOrder: overrides.enforcementOrder ?? 1,
    group: overrides.group ?? "architecture",
    quick_tip: overrides.quick_tip,
  };

  return {
    filePath: `${meta.id}.md`,
    meta,
    header: {
      constraintId: meta.id,
      severity: "error",
      enforcementOrder: meta.enforcementOrder,
    },
    sections: STUB_SECTIONS,
  };
}

const STUB_SECTIONS: ConstraintSections = CONSTRAINT_SECTION_ORDER.reduce(
  (acc, section) => {
    acc[section] = `${section} stub`;
    return acc;
  },
  {} as ConstraintSections,
);
