import path from "node:path";

import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

import { runAgentCommand } from "../../src/cli/commands/agent.js";

const PROJECT_CWD = path.resolve(
  "tests/fixtures/projects/full-stack/next-baseline",
);

interface PhaseExpectation {
  phase: string;
  banner: string;
  include: string[];
  exclude?: string[];
}

const PHASE_CASES: PhaseExpectation[] = [
  {
    phase: "foundation",
    banner: "CDA AGENT PROMPT - PHASE 1: FOUNDATION LAYER",
    include: ["central-config-entrypoint", "=== PHASE 1 OBJECTIVE ==="],
    exclude: ["domain-purity"],
  },
  {
    phase: "domain",
    banner: "CDA AGENT PROMPT - PHASE 2: DOMAIN LAYER",
    include: ["central-config-entrypoint", "domain-purity", "Phase Mode: domain"],
  },
  {
    phase: "infrastructure",
    banner: "CDA AGENT PROMPT - PHASE 3: INFRASTRUCTURE LAYER",
    include: ["ports-and-adapters-integrity", "domain-purity", "=== ARCHITECTURAL CONTEXT ==="],
  },
  {
    phase: "application",
    banner: "CDA AGENT PROMPT - PHASE 4: APPLICATION LAYER",
    include: ["mvc-layer-separation", "ports-and-adapters-integrity", "=== NEXT STEPS ==="],
  },
  {
    phase: "presentation",
    banner: "CDA AGENT PROMPT - PHASE 5: PRESENTATION LAYER",
    include: ["fastify-http-server", "tanstack-query-async", "Next Phase: None"],
  },
];

describe("agent command --phase integration", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it.each(PHASE_CASES)("renders phase banner for %s", async (testCase) => {
    await runAgentCommand(["--phase", testCase.phase, "--dry-run"], {
      cwd: PROJECT_CWD,
    });

    const promptOutput = logSpy.mock.calls.map(([value]) => String(value)).join("\n");
    expect(promptOutput).toContain(testCase.banner);
    for (const snippet of testCase.include) {
      expect(promptOutput).toContain(snippet);
    }
    for (const snippet of testCase.exclude ?? []) {
      expect(promptOutput).not.toContain(snippet);
    }
    expect(promptOutput).toContain("=== NEXT STEPS ===");
  });

  it("rejects invalid phase names and conflicts", async () => {
    await expect(
      runAgentCommand(["--phase", "unknown"], { cwd: PROJECT_CWD }),
    ).rejects.toThrow(/Unknown phase/);

    await expect(
      runAgentCommand(
        ["--phase", "foundation", "--constraint", "central-config-entrypoint"],
        { cwd: PROJECT_CWD },
      ),
    ).rejects.toThrow(/Use either --phase or --constraint/);

    await expect(
      runAgentCommand(["--phase", "domain", "--sequential"], {
        cwd: PROJECT_CWD,
      }),
    ).rejects.toThrow(/either --phase or --sequential/);
  });
});
