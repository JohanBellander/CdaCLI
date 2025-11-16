// Beads-Test: CDATool-xfm CDATool-0xi CDATool-gnl CDATool-0nz CDATool-80h

import { describe, expect, it } from "vitest";

import {
  CONSTRAINT_SECTION_ORDER,
  type ConstraintDocument,
  type ConstraintSections,
} from "../../src/core/constraintLoader.js";
import {
  assemblePrompt,
  buildArchitectureChecklist,
  buildImplementationOrderSection,
  buildPatternExamplesSection,
  buildQuickTipsSection,
} from "../../src/core/promptAssembler.js";
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

describe("buildPatternExamplesSection", () => {
  it("returns empty string when no quick examples are defined", () => {
    const section = buildPatternExamplesSection([
      createConstraintDocument({ id: "domain-purity" }),
    ]);
    expect(section).toBe("");
  });

  it("renders each quick example with an identifier header", () => {
    const section = buildPatternExamplesSection([
      createConstraintDocument({
        id: "c1",
        quick_example: "Example block one",
      }),
      createConstraintDocument({
        id: "c2",
        quick_example: "Second example",
      }),
    ]);

    expect(section).toContain("===== PATTERN EXAMPLES (Concrete Implementation) =====");
    expect(section).toContain("[c1]");
    expect(section).toContain("Example block one");
    expect(section).toContain("[c2]");
    expect(section).toContain("Second example");
    expect(section).toContain("===== END PATTERN EXAMPLES =====");
  });

  it("filters out constraints without quick examples", () => {
    const section = buildPatternExamplesSection([
      createConstraintDocument({
        id: "c1",
        quick_example: "Keep me",
      }),
      createConstraintDocument({
        id: "c2",
      }),
      createConstraintDocument({
        id: "c3",
        quick_example: "Another example",
      }),
    ]);

    expect(section).toContain("[c1]");
    expect(section).toContain("Keep me");
    expect(section).not.toContain("[c2]");
    expect(section).toContain("[c3]");
    expect(section).toContain("Another example");
  });

  it("preserves multi-line formatting", () => {
    const section = buildPatternExamplesSection([
      createConstraintDocument({
        id: "format-test",
        quick_example: "DO:\n  line 1\n  line 2\n\nDON'T:\n  incorrect line",
      }),
    ]);

    expect(section).toContain("DO:");
    expect(section).toContain("line 1");
    expect(section).toContain("DON'T:");
    expect(section).toContain("incorrect line");
  });
});

describe("buildArchitectureChecklist", () => {
  it("returns empty string when no checklist items exist", () => {
    const section = buildArchitectureChecklist([
      createConstraintDocument({ id: "c1" }),
    ]);
    expect(section).toBe("");
  });

  it("renders each checklist item with constraint reference", () => {
    const section = buildArchitectureChecklist([
      createConstraintDocument({
        id: "coverage",
        checklist_item: "Do I know where test files go?",
      }),
      createConstraintDocument({
        id: "logging",
        checklist_item: "Will I import logger from infra/telemetry/logger.ts?",
      }),
    ]);

    expect(section).toContain("===== ARCHITECTURE CHECKLIST (Review Before Coding) =====");
    expect(section).toContain("? Do I know where test files go?");
    expect(section).toContain("-> Constraint: coverage");
    expect(section).toContain("? Will I import logger from infra/telemetry/logger.ts?");
    expect(section).toContain("-> Constraint: logging");
    expect(section).toContain("If you answered NO to any question, review the examples above.");
  });

  it("filters out constraints without checklist copy", () => {
    const section = buildArchitectureChecklist([
      createConstraintDocument({
        id: "included",
        checklist_item: "Valid question",
      }),
      createConstraintDocument({
        id: "skipped",
      }),
    ]);

    expect(section).toContain("Valid question");
    expect(section).not.toContain("skipped");
  });
});

describe("buildImplementationOrderSection", () => {
  it("always returns content", () => {
    const section = buildImplementationOrderSection();
    expect(section.length).toBeGreaterThan(100);
    expect(section).toContain("===== RECOMMENDED IMPLEMENTATION ORDER =====");
  });

  it("lists all phases and checkpoints", () => {
    const section = buildImplementationOrderSection();
    expect(section).toContain("Phase 1: FOUNDATION");
    expect(section).toContain("Phase 2: DOMAIN");
    expect(section).toContain("Phase 3: INFRASTRUCTURE");
    expect(section).toContain("Phase 4: APPLICATION");
    expect(section).toContain("Phase 5: PRESENTATION");
    expect(section).toContain("Checkpoint: Run `cda run --exec`");
    expect(section).toContain("Target <12 violations");
    expect(section).toContain("===== END IMPLEMENTATION ORDER =====");
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
    expect(result.prompt).toContain("===== RECOMMENDED IMPLEMENTATION ORDER =====");
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
    expect(result.prompt).not.toContain("RECOMMENDED IMPLEMENTATION ORDER");
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
    const orderIndex = prompt.indexOf("===== RECOMMENDED IMPLEMENTATION ORDER =====");
    const directiveIndex = prompt.indexOf("AGENT DIRECTIVE:");

    expect(tipsIndex).toBeGreaterThan(instructionsIndex);
    expect(orderIndex).toBeGreaterThan(tipsIndex);
    expect(directiveIndex).toBeGreaterThan(orderIndex);
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
    expect(result.prompt).not.toContain("PATTERN EXAMPLES (Concrete Implementation)");
    expect(result.prompt).not.toContain("ARCHITECTURE CHECKLIST");
    expect(result.prompt).toContain("RECOMMENDED IMPLEMENTATION ORDER");
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
          quick_example: "Example block",
          checklist_item: "Question?",
        }),
      ],
    });

    expect(result.prompt).not.toContain("===== COMMON FIRST-RUN PITFALLS =====");
    expect(result.prompt).not.toContain("PATTERN EXAMPLES (Concrete Implementation)");
    expect(result.prompt).not.toContain("ARCHITECTURE CHECKLIST");
    expect(result.prompt).not.toContain("RECOMMENDED IMPLEMENTATION ORDER");
  });

  it("includes new sections when constraints define metadata", () => {
    const result = assemblePrompt({
      runId: "sections",
      generatedAt: new Date("2025-11-08T09:00:00.000Z"),
      agentName: "copilot",
      instructionText: SAMPLE_INSTRUCTIONS,
      enabledConstraints: [
        createConstraintDocument({
          id: "test-coverage-contracts",
          quick_tip: "Tip text",
          quick_example: "Example text",
          checklist_item: "Question?",
        }),
      ],
    });

    const prompt = result.prompt;
    expect(prompt).toContain("===== COMMON FIRST-RUN PITFALLS =====");
    expect(prompt).toContain("===== PATTERN EXAMPLES (Concrete Implementation) =====");
    expect(prompt).toContain("[test-coverage-contracts]");
    expect(prompt).toContain("Example text");
    expect(prompt).toContain("===== ARCHITECTURE CHECKLIST (Review Before Coding) =====");
    expect(prompt).toContain("? Question?");
    expect(prompt).toContain("===== RECOMMENDED IMPLEMENTATION ORDER =====");
  });

  it("preserves section ordering across prompt assembly", () => {
    const result = assemblePrompt({
      runId: "ordering",
      generatedAt: new Date("2025-11-08T09:00:00.000Z"),
      agentName: "copilot",
      instructionText: "INSTRUCTIONS_MARKER",
      enabledConstraints: [
        createConstraintDocument({
          id: "example",
          quick_tip: "Tip text",
          quick_example: "Example block",
          checklist_item: "Checklist?",
        }),
      ],
    });

    const prompt = result.prompt;
    const instructionsIndex = prompt.indexOf("INSTRUCTIONS_MARKER");
    const tipsIndex = prompt.indexOf("===== COMMON FIRST-RUN PITFALLS =====");
    const examplesIndex = prompt.indexOf("===== PATTERN EXAMPLES (Concrete Implementation) =====");
    const checklistIndex = prompt.indexOf("===== ARCHITECTURE CHECKLIST (Review Before Coding) =====");
    const orderIndex = prompt.indexOf("===== RECOMMENDED IMPLEMENTATION ORDER =====");
    const directiveIndex = prompt.indexOf("AGENT DIRECTIVE:");

    expect(instructionsIndex).toBeGreaterThan(-1);
    expect(tipsIndex).toBeGreaterThan(instructionsIndex);
    expect(examplesIndex).toBeGreaterThan(tipsIndex);
    expect(checklistIndex).toBeGreaterThan(examplesIndex);
    expect(orderIndex).toBeGreaterThan(checklistIndex);
    expect(directiveIndex).toBeGreaterThan(orderIndex);
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
    quick_example: overrides.quick_example,
    checklist_item: overrides.checklist_item,
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
