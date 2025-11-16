import path from "node:path";
import { EventEmitter } from "node:events";

import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

import { runAgentCommand } from "../../src/cli/commands/agent.js";

const spawnMock = vi.fn();

vi.mock("node:child_process", () => ({
  spawn: (...args: Parameters<typeof spawnMock>) => spawnMock(...args),
}));

const fixturesDir = path.resolve("tests/fixtures/agents");
const optionalConstraintsDir = path.resolve(
  "tests/fixtures/optional-constraints-only",
);

describe("cda agent integration", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    spawnMock.mockReset();
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it("prints quick tips in dry-run output when quick_tip constraints are enabled", async () => {
    await runAgentCommand(["--dry-run"], {
      cwd: path.join(fixturesDir, "valid"),
    });

    const output = collectLogs(logSpy);
    expect(output).toContain("===== COMMON FIRST-RUN PITFALLS =====");
    expect(output).toMatch(/Domain entities use plain TypeScript only/i);
  });

  it("omits quick tips when constraint set has no quick_tip metadata", async () => {
    await runAgentCommand(["--dry-run"], {
      cwd: path.join(fixturesDir, "valid"),
      constraintsDir: optionalConstraintsDir,
    });

    const output = collectLogs(logSpy);
    expect(output).not.toContain("===== COMMON FIRST-RUN PITFALLS =====");
  });

  it("pipes quick tips to the spawned agent when executing", async () => {
    const { child, writeSpy } = createSpawnChild();
    spawnMock.mockImplementation(() => child);

    await runAgentCommand(["--agent", "copilot-stdin"], {
      cwd: path.join(fixturesDir, "valid"),
    });

    const promptPayload = writeSpy.mock.calls.map((call) => call[0]).join("");
    expect(promptPayload).toContain("===== COMMON FIRST-RUN PITFALLS =====");
    expect(promptPayload).toMatch(/Based on your active constraints/i);
  });
});

function collectLogs(
  spy: ReturnType<typeof vi.spyOn>,
): string {
  return spy.mock.calls
    .map((args: unknown[]) => String(args[0]))
    .join("\n");
}

function createSpawnChild(): {
  child: EventEmitter & {
    stdin: { write: ReturnType<typeof vi.fn>; end: ReturnType<typeof vi.fn> };
  };
  writeSpy: ReturnType<typeof vi.fn>;
} {
  const child = new EventEmitter() as EventEmitter & {
    stdin: { write: ReturnType<typeof vi.fn>; end: ReturnType<typeof vi.fn> };
  };
  const writeSpy = vi.fn();
  const endSpy = vi.fn();
  child.stdin = {
    write: writeSpy,
    end: endSpy,
  };
  setImmediate(() => {
    child.emit("spawn");
    setImmediate(() => {
      child.emit("close", 0);
    });
  });
  return { child, writeSpy };
}
