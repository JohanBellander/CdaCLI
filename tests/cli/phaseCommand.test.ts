import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ConstraintDocument } from "../../src/core/constraintLoader.js";

const mockConstraints: ConstraintDocument[] = [];

vi.mock("../../src/core/constraintLoader.js", async (importOriginal) => {
  const actual = await importOriginal<{
    loadConstraints: typeof import("../../src/core/constraintLoader.js").loadConstraints;
  }>();
  return {
    ...actual,
    loadConstraints: vi.fn(async () => mockConstraints),
    partitionConstraints: vi.fn(() => {
      const active = mockConstraints.filter((doc) => doc.meta.isActive);
      const disabled = mockConstraints.filter((doc) => !doc.meta.isActive);
      return { active, disabled };
    }),
  };
});

vi.mock("../../src/core/instructionEmitter.js", () => ({
  buildBatchInstructionPackage: vi.fn(() => ({ kind: "batch" })),
  buildSingleInstructionPackage: vi.fn(() => ({ kind: "single" })),
}));

vi.mock("../../src/cli/formatters.js", () => ({
  formatBatchInstructionPackage: vi.fn(() => "batch render"),
  formatLegacyBatchInstructionPackage: vi.fn(() => "legacy batch render"),
  formatSingleInstructionPackage: vi.fn(() => "single render"),
  formatLegacySingleInstructionPackage: vi.fn(() => "legacy single render"),
}));

vi.mock("../../src/core/promptAssembler.js", () => ({
  assemblePrompt: vi.fn(() => ({
    prompt: "assembled prompt",
    charCount: 42,
    approxTokenLength: 10,
  })),
}));

vi.mock("../../src/core/agentConfig.js", () => ({
  loadAgentConfig: vi.fn(async () => null),
  resolveAgent: vi.fn(),
}));

import { runAgentCommand } from "../../src/cli/commands/agent.js";
import { runValidateCommand } from "../../src/cli/commands/validate.js";

function createConstraint(id: string, isActive = true): ConstraintDocument {
  return {
    filePath: `${id}.md`,
    meta: {
      id,
      name: id,
      category: "test",
      severity: "error",
      enabled: true,
      optional: false,
      isActive,
      version: 1,
      enforcementOrder: 1,
      group: "architecture",
    },
    header: {
      constraintId: id,
      severity: "error",
      enforcementOrder: 1,
    },
    sections: {} as any,
  };
}

describe("phase flag behavior", () => {
  beforeEach(() => {
    mockConstraints.length = 0;
    mockConstraints.push(
      createConstraint("central-config-entrypoint"),
      createConstraint("structural-naming-consistency"),
      createConstraint("observability-discipline", false),
    );
  });

  it("rejects invalid phase names", async () => {
    await expect(runAgentCommand(["--phase", "invalid"])).rejects.toThrow(
      /Unknown phase/,
    );
  });

  it("prevents mixing --phase with --constraint or --sequential", async () => {
    await expect(
      runAgentCommand(["--phase", "foundation", "--constraint", "foo"]),
    ).rejects.toThrow(/Use either --phase or --constraint/);

    await expect(
      runAgentCommand(["--phase", "foundation", "--sequential"]),
    ).rejects.toThrow(/Use either --phase or --sequential/);

    await expect(
      runValidateCommand(["--phase", "foundation", "--constraint", "foo"]),
    ).rejects.toThrow(/either --phase or --constraint/);
  });

  it("warns when a phase contains disabled or missing constraints", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await runAgentCommand(["--phase", "foundation", "--dry-run"], {
      cwd: process.cwd(),
    });

    const warnings = warnSpy.mock.calls.map(([message]) => String(message));
    expect(
      warnings.some((line) => line.includes("disabled constraint")),
    ).toBe(true);
    expect(warnings.some((line) => line.includes("missing constraint"))).toBe(
      true,
    );

    warnSpy.mockRestore();
  });

  it("throws when all constraints in a phase are disabled", async () => {
    mockConstraints.length = 0;
    mockConstraints.push(
      createConstraint("central-config-entrypoint", false),
      createConstraint("observability-discipline", false),
    );

    await expect(
      runAgentCommand(["--phase", "foundation", "--dry-run"]),
    ).rejects.toThrow(/no active constraints/i);
  });
});
