// Beads-Test: CDATool-qpa CDATool-80h CDATool-ga7 CDATool-8nj

import path from "node:path";

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { runAgentCommand } from "../../src/cli/commands/agent.js";

vi.mock("node:child_process", () => ({
  spawn: vi.fn(() => {
    throw new Error("spawn should not be called in dry-run tests");
  }),
}));

const fixturesDir = path.resolve("tests/fixtures/agents");

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

describe("cda agent --dry-run", () => {
  it("prints command line and prompt with metadata", async () => {
    await runAgentCommand(["--dry-run"], {
      cwd: path.join(fixturesDir, "valid"),
    });

    const outputs = logSpy.mock.calls.map((call) => call[0]).join("\n");
    expect(outputs).toMatch(/AGENT COMMAND: gh copilot chat --model gpt-5/);
    expect(outputs).toMatch(
      /AGENT VERIFICATION MODE: PROMPT INTENDED FOR AUTOMATED EXECUTION/,
    );
    expect(outputs).toMatch(/agent_name: copilot/);
    expect(outputs).toMatch(/token_estimate_method: heuristic_chars_div_4/);
    expect(outputs).toMatch(/AGENT DIRECTIVE:/);
    expect(outputs).toMatch(/original_char_count:/);
    expect(outputs).toMatch(/approx_token_length:/);
  });

  it("omits command output when --no-exec provided", async () => {
    await runAgentCommand(["--no-exec"], {
      cwd: path.join(fixturesDir, "valid"),
    });

    const firstCall = logSpy.mock.calls[0]?.[0];
    expect(firstCall).not.toMatch(/AGENT COMMAND:/);
  });

  it("omits agent banner in legacy format", async () => {
    await runAgentCommand(["--no-exec", "--legacy-format"], {
      cwd: path.join(fixturesDir, "valid"),
    });

    const outputs = logSpy.mock.calls.map((call) => call[0]).join("\n");
    expect(outputs).not.toMatch(
      /AGENT VERIFICATION MODE: PROMPT INTENDED FOR AUTOMATED EXECUTION/,
    );
    expect(outputs).not.toMatch(/original_char_count:/);
  });

  it("uses single constraint instructions when --constraint supplied", async () => {
    await runAgentCommand(
      ["--dry-run", "--constraint", "domain-no-side-effects"],
      { cwd: path.join(fixturesDir, "valid") },
    );

    const outputs = logSpy.mock.calls.map((call) => call[0]).join("\n");
    expect(outputs).toMatch(/mode: single/);
    expect(outputs).toMatch(/domain-no-side-effects/);
  });

  it("uses first constraint when --sequential flag provided", async () => {
    await runAgentCommand(["--dry-run", "--sequential"], {
      cwd: path.join(fixturesDir, "valid"),
    });

    const outputs = logSpy.mock.calls.map((call) => call[0]).join("\n");
    expect(outputs).toMatch(/mode: single/);
    expect(outputs).toMatch(/domain-no-imports-from-app-or-infra/);
  });

  it("uses selected agent definition when --agent provided", async () => {
    await runAgentCommand(["--dry-run", "--agent", "echo"], {
      cwd: path.join(fixturesDir, "valid"),
    });

    const outputs = logSpy.mock.calls.map((call) => call[0]).join("\n");
    expect(outputs).toMatch(/AGENT COMMAND: echo/);
    expect(outputs).toMatch(/agent_name: echo/);
  });

  it("warns but does not error when config missing even if agent specified", async () => {
    await runAgentCommand(["--dry-run", "--agent", "copilot"], {
      cwd: path.join(fixturesDir, "empty"),
    });

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringMatching(/No cda\.agents\.json found/i),
    );
  });
});
