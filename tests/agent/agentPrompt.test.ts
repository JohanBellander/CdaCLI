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
const originalPlatformOverride = process.env.CDA_PLATFORM_OVERRIDE;
const originalWindowsLimit = process.env.CDA_WINDOWS_ARG_LIMIT;

function createSpawnSuccess() {
  const child = new EventEmitter() as any;
  const writeSpy = vi.fn();
  const endSpy = vi.fn();
  child.stdin = {
    write: writeSpy,
    end: endSpy,
  } as any;
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

function createSpawnEnoent() {
  const child = new EventEmitter() as any;
  child.stdin = new PassThrough();
  setImmediate(() => {
    child.emit("error", Object.assign(new Error("missing"), { code: "ENOENT" }));
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
  if (originalPlatformOverride === undefined) {
    delete process.env.CDA_PLATFORM_OVERRIDE;
  } else {
    process.env.CDA_PLATFORM_OVERRIDE = originalPlatformOverride;
  }
  if (originalWindowsLimit === undefined) {
    delete process.env.CDA_WINDOWS_ARG_LIMIT;
  } else {
    process.env.CDA_WINDOWS_ARG_LIMIT = originalWindowsLimit;
  }
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

  it("spawns external command in arg mode when not in dry-run/no-exec", async () => {
    spawnMock.mockImplementation(() => createSpawnSuccess());
    await runAgentCommand([], { cwd: path.join(fixturesDir, "valid") });
    const [command, args, options] = spawnMock.mock.calls[0]!;
    expect(command).toBe("copilot");
    expect(args).toEqual(expect.arrayContaining(["--model", "gpt-5", "--allow-all-tools"]));
    if (process.platform === "win32") {
      expect(args).toEqual(
        expect.arrayContaining(["--prompt-file", expect.stringMatching(/cda-agent-prompt/)]),
      );
    } else {
      expect(args).toEqual(
        expect.arrayContaining(["-p", expect.any(String)]),
      );
    }
    expect(options).toEqual({ stdio: ["ignore", "inherit", "inherit"] });
    const child = spawnMock.mock.results[0]!.value as any;
    expect(child.__writeSpy).not.toHaveBeenCalled();
  });

  it("uses prompt file fallback on Windows when inline args would exceed limit", async () => {
    process.env.CDA_PLATFORM_OVERRIDE = "win32";
    process.env.CDA_WINDOWS_ARG_LIMIT = "100";
    spawnMock.mockImplementation(() => createSpawnSuccess());

    await runAgentCommand([], { cwd: path.join(fixturesDir, "valid") });

    expect(spawnMock).toHaveBeenCalledWith(
      "copilot",
      expect.arrayContaining(["--prompt-file", expect.stringMatching(/cda-agent-prompt/)]),
      { stdio: ["ignore", "inherit", "inherit"] },
    );
    const child = spawnMock.mock.results[0].value as any;
    expect(child.__writeSpy).not.toHaveBeenCalled();
  });

  it("retries with .cmd on Windows when the shimmed command is missing", async () => {
    process.env.CDA_PLATFORM_OVERRIDE = "win32";
    spawnMock
      .mockImplementationOnce(() => createSpawnEnoent())
      .mockImplementationOnce(() => createSpawnSuccess());

    await runAgentCommand([], { cwd: path.join(fixturesDir, "valid") });

    expect(spawnMock).toHaveBeenNthCalledWith(
      1,
      "copilot",
      expect.any(Array),
      { stdio: ["ignore", "inherit", "inherit"] },
    );
    expect(spawnMock).toHaveBeenNthCalledWith(
      2,
      "copilot.cmd",
      expect.any(Array),
      { stdio: ["ignore", "inherit", "inherit"] },
    );
  });

  it("uses stdin piping for stdin-mode agents", async () => {
    spawnMock.mockImplementation(() => createSpawnSuccess());
    await runAgentCommand(["--agent", "echo"], {
      cwd: path.join(fixturesDir, "valid"),
    });
    expect(spawnMock).toHaveBeenCalledWith(
      "echo",
      [],
      { stdio: ["pipe", "inherit", "inherit"] },
    );
    const child = spawnMock.mock.results[0].value as any;
    expect(child.__writeSpy).toHaveBeenCalled();
  });

  it("maps ENOENT spawn errors to fatal CDA errors", async () => {
    spawnMock.mockImplementation(() => createSpawnEnoent());

    await expect(
      runAgentCommand([], { cwd: path.join(fixturesDir, "valid") }),
    ).rejects.toThrow(/Unable to spawn 'copilot'.*Tried commands:/);
  });
});
