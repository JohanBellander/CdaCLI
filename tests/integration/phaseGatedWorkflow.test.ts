import path from "node:path";

import { beforeAll, describe, expect, it, vi } from "vitest";

import { runAgentCommand } from "../../src/cli/commands/agent.js";

const PROJECT_CWD = path.resolve(
  "tests/fixtures/projects/full-stack/next-baseline",
);

interface PhaseResult {
  prompt: string;
  constraintCount: number;
}

const PHASES_WITH_COUNTS = [
  { phase: "foundation", expected: 7 },
  { phase: "domain", expected: 14 },
  { phase: "infrastructure", expected: 19 },
  { phase: "application", expected: 25 },
  { phase: "presentation", expected: 29 },
];

const phasePrompts: Record<string, PhaseResult> = {};
let baselinePrompt: PhaseResult;

async function capturePrompt(args: string[]): Promise<PhaseResult> {
  const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  try {
    await runAgentCommand(args, {
      cwd: PROJECT_CWD,
    });
    const prompt = logSpy.mock.calls.map(([value]) => String(value)).join("\n");
    const constraintCount =
      prompt.match(/CONSTRAINT \(INSTRUCTION ONLY - NO DETECTION YET\):/g)?.length ??
      0;
    return { prompt, constraintCount };
  } finally {
    logSpy.mockRestore();
    warnSpy.mockRestore();
  }
}

async function generatePhasePrompt(phase: string): Promise<PhaseResult> {
  return capturePrompt(["--phase", phase, "--dry-run"]);
}

async function generateFullPrompt(): Promise<PhaseResult> {
  return capturePrompt(["--dry-run"]);
}

describe("phase-gated workflow end-to-end", () => {
  beforeAll(async () => {
    for (const { phase } of PHASES_WITH_COUNTS) {
      phasePrompts[phase] = await generatePhasePrompt(phase);
    }
    baselinePrompt = await generateFullPrompt();
  });

  it.each(PHASES_WITH_COUNTS)(
    "keeps %s prompt smaller than full run and maintains cumulative constraints",
    ({ phase, expected }) => {
      const result = phasePrompts[phase];
      expect(result.constraintCount).toBe(expected);
      if (phase === "presentation") {
        expect(result.prompt.length).toBeLessThanOrEqual(
          baselinePrompt.prompt.length + 5_000,
        );
      } else {
        expect(result.prompt.length).toBeLessThan(baselinePrompt.prompt.length);
      }
      const header = result.prompt.split("\n").slice(0, 25).join("\n");
      const sanitizedHeader = header
        .replace(/run_id: .*/g, "run_id: <redacted>")
        .replace(/generated_at: .*/g, "generated_at: <redacted>");
      expect(sanitizedHeader).toMatchSnapshot(`${phase}-prompt-header`);
    },
  );

  it("includes earlier constraints when advancing phases", () => {
    const infrastructurePrompt = phasePrompts["infrastructure"].prompt;
    expect(infrastructurePrompt).toContain("central-config-entrypoint");
    expect(infrastructurePrompt).toContain("domain-purity");
    expect(infrastructurePrompt).toContain("ports-and-adapters-integrity");
  });

  it("covers the full constraint set by the presentation phase", () => {
    const presentationPrompt = phasePrompts["presentation"].prompt;
    expect(presentationPrompt).toContain("fastify-http-server");
    expect(presentationPrompt).toContain("nextjs-app-structure");
    expect(presentationPrompt).toContain("react-ui-only");
    expect(presentationPrompt).toContain("tanstack-query-async");
  });
});
