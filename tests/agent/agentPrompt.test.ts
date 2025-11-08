// Beads-Test: CDATool-kmz CDATool-6md CDATool-87t

import path from "node:path";
import { PassThrough } from "node:stream";
import { EventEmitter } from "node:events";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const spawnMock = vi.fn();

vi.mock("node:child_process", () => ({
  spawn: (...args: Parameters<typeof spawnMock>) => spawnMock(...args),
}));

import { runAgentCommand } from "../../src/cli/commands/agent.js";

const fixturesDir = path.resolve("tests/fixtures/agents");

function createSpawnSuccess() {
  const child = new EventEmitter() as any;
  child.stdin = new PassThrough();
  queueMicrotask(() => {
    child.emit("close", 0);
  });
  return child;
}

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

describe("agent command prompt behaviour", () => {
  it("writes prompt to file when --output provided", async () => {
    const tmpDir = path.join(fixturesDir, "valid");
    const outputFile = path.join(tmpDir, "prompt-output.txt");
    const fs = await import("node:fs/promises");
    try {
      await fs.unlink(outputFile);
    } catch {
      // ignore
    }

    await runAgentCommand(["--dry-run", "--output", "prompt-output.txt"], {
      cwd: tmpDir,
    });

    const written = await fs.readFile(outputFile, "utf8");
    expect(written).toMatch(/AGENT VERIFICATION MODE/);
    await fs.unlink(outputFile);
  });

  it("enforces max_length from config", async () => {
    await expect(
      runAgentCommand(["--dry-run"], {
        cwd: path.join(fixturesDir, "max-length"),
      }),
    ).rejects.toThrow(/exceeds max_length/i);
  });

  it("emits warning and skips execution when config missing", async () => {
    await runAgentCommand(["--dry-run"], {
      cwd: path.join(fixturesDir, "empty"),
    });
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringMatching(/No cda\.agents\.json found/i),
    );
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it("spawns external command when not in dry-run/no-exec", async () => {
    spawnMock.mockImplementation(() => createSpawnSuccess());
    await runAgentCommand([], { cwd: path.join(fixturesDir, "valid") });
    expect(spawnMock).toHaveBeenCalledWith(
      "gh",
      ["copilot", "chat", "--model", "gpt-5"],
      { stdio: ["pipe", "inherit", "inherit"] },
    );
  });

  it("maps ENOENT spawn errors to fatal CDA errors", async () => {
    spawnMock.mockImplementation(() => {
      const child = new EventEmitter() as any;
      queueMicrotask(() => {
        child.emit("error", Object.assign(new Error("cmd missing"), { code: "ENOENT" }));
      });
      child.stdin = new PassThrough();
      return child;
    });

    await expect(
      runAgentCommand([], { cwd: path.join(fixturesDir, "valid") }),
    ).rejects.toThrow(/Unable to spawn/);
  });
});
