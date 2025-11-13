import path from "node:path";
import { EventEmitter } from "node:events";

import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

import { runRunCommand } from "../../src/cli/commands/run.js";

const spawnMock = vi.fn();

vi.mock("node:child_process", () => ({
  spawn: (...args: Parameters<typeof spawnMock>) => spawnMock(...args),
}));

const fixturesDir = path.resolve("tests/fixtures/agents");
const OPTIONAL_PROJECT = path.resolve(
  "tests/fixtures/projects/optional/some-disabled",
);
const OPTIONAL_CONSTRAINTS = path.resolve(
  "tests/fixtures/optional-constraints",
);

function createSpawnSuccess() {
  const child = new EventEmitter() as any;
  const writeSpy = vi.fn();
  const endSpy = vi.fn();
  child.stdin = {
    write: writeSpy,
    end: endSpy,
  };
  child.__writeSpy = writeSpy;
  child.__endSpy = endSpy;
  setImmediate(() => {
    child.emit("spawn");
    setImmediate(() => {
      child.emit("close", 0);
    });
  });
  return child;
}

describe("cda run integration modes", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    spawnMock.mockReset();
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it("plan mode prints command preview and prompt", async () => {
    await runRunCommand(["--plan"], {
      cwd: path.join(fixturesDir, "valid"),
    });

    expect(spawnMock).not.toHaveBeenCalled();
    const output = logSpy.mock.calls
      .map((call: unknown[]) => String(call[0]))
      .join("\n");
    expect(output).toMatch(/AGENT COMMAND:/);
    expect(output).toMatch(/AGENT VERIFICATION MODE: PROMPT INTENDED/);
    expect(output).toMatch(/disabled_constraints: \[mvc-layer-separation, mvp-presenter-boundaries\]/);
  });

  it("exec mode logs disabled constraints before invoking the agent", async () => {
    spawnMock.mockImplementation(() => createSpawnSuccess());

    await runRunCommand(["--exec"], {
      cwd: OPTIONAL_PROJECT,
      constraintsDir: OPTIONAL_CONSTRAINTS,
    });

    expect(errorSpy).toHaveBeenCalledWith(
      "Constraint 'optional-enabled' disabled via configuration.",
    );
    expect(spawnMock).toHaveBeenCalled();
    const [command] = spawnMock.mock.calls[0] ?? [];
    expect(command).toBe("copilot");
  });
});
