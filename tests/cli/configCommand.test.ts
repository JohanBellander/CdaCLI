import path from "node:path";
import { EventEmitter } from "node:events";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { runConfigCommand } from "../../src/cli/commands/config.js";

const OPTIONAL_PROJECT = path.resolve(
  "tests/fixtures/projects/optional/some-disabled",
);
const OPTIONAL_CONSTRAINTS = path.resolve("tests/fixtures/optional-constraints");
const MANDATORY_PROJECT = path.resolve(
  "tests/fixtures/projects/mandatory-only",
);
const MANDATORY_CONSTRAINTS = path.resolve(
  "tests/fixtures/mandatory-constraints",
);
const FIXTURE_CONFIG_PATH = path.join(OPTIONAL_PROJECT, "cda.config.json");
const TMP_PREFIX = path.join(tmpdir(), "cda-config-");

let logSpy: ReturnType<typeof vi.spyOn>;
const tempDirs: string[] = [];

beforeEach(() => {
  logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(async () => {
  logSpy.mockRestore();
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  }
});

describe("cda config help output", () => {
  it("prints experimental help text for --help", async () => {
    await expect(runConfigCommand(["--help"])).resolves.toBeUndefined();

    const output = logSpy.mock.calls
      .map((call: unknown[]) => String(call[0]))
      .join("\n");
    expect(output).toContain("cda config (experimental)");
    expect(output).toContain("Usage:");
    expect(output).toContain("interactive terminal");
  });
});

describe("cda config interactive orchestration", () => {
  it("rejects non-TTY environments early", async () => {
    await expect(
      runConfigCommand([], {
        cwd: OPTIONAL_PROJECT,
        stdin: createMockStdin(false),
        stdout: createMockStdout(false),
      }),
    ).rejects.toThrow(/interactive TTY/);
  });

  it("loads constraints and passes state into the interactive runner", async () => {
    const runInteractive = vi.fn(async (state) => {
      expect(state.length).toBeGreaterThan(0);
      expect(
        state.some((entry) => entry.optional && entry.toggleable),
      ).toBe(true);
      return { status: "saved", state };
    });

    await runConfigCommand([], {
      cwd: OPTIONAL_PROJECT,
      constraintsDir: OPTIONAL_CONSTRAINTS,
      stdin: createMockStdin(true),
      stdout: createMockStdout(true),
      runInteractive,
    });

    expect(runInteractive).toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringMatching(/Updated cda\.config\.json/),
    );
  });

  it("errors when cda.config.json is missing", async () => {
    const cwd = await createTempProject({ writeConfig: false });
    await expect(
      runConfigCommand([], {
        cwd,
        constraintsDir: OPTIONAL_CONSTRAINTS,
        stdin: createMockStdin(true),
        stdout: createMockStdout(true),
      }),
    ).rejects.toThrow(/Project config not found/);
  });

  it("surfaced loader errors from invalid overrides", async () => {
    const cwd = await createTempProject({
      configContents: JSON.stringify(
        {
          version: 1,
          constraints: "builtin",
          constraint_overrides: {
            unknown: { enabled: true },
          },
        },
        null,
        2,
      ),
    });

    await expect(
      runConfigCommand([], {
        cwd,
        constraintsDir: OPTIONAL_CONSTRAINTS,
        stdin: createMockStdin(true),
        stdout: createMockStdout(true),
      }),
    ).rejects.toThrow(/references unknown constraint/);
  });

  it("handles projects without optional constraints", async () => {
    const runInteractive = vi.fn(async (state) => {
      expect(state.every((entry) => entry.toggleable === true)).toBe(true);
      return { status: "saved", state };
    });

    await runConfigCommand([], {
      cwd: MANDATORY_PROJECT,
      constraintsDir: MANDATORY_CONSTRAINTS,
      stdin: createMockStdin(true),
      stdout: createMockStdout(true),
      runInteractive,
    });

    expect(runInteractive).toHaveBeenCalled();
  });

  it("allows disabling constraints that previously behaved as mandatory", async () => {
    const cwd = await createTempProject();
    const runInteractive = vi.fn(async (state) => {
      return {
        status: "saved",
        state: state.map((entry) => {
          if (entry.id === "mandatory-default") {
            return { ...entry, effectiveEnabled: false };
          }
          return entry;
        }),
      };
    });

    await runConfigCommand([], {
      cwd,
      constraintsDir: OPTIONAL_CONSTRAINTS,
      stdin: createMockStdin(true),
      stdout: createMockStdout(true),
      runInteractive,
    });

    const raw = await readFile(path.join(cwd, "cda.config.json"), "utf8");
    const parsed = JSON.parse(raw);
    expect(parsed.constraint_overrides).toEqual({
      "optional-enabled": { enabled: false },
      "optional-disabled": { enabled: true },
      "mandatory-default": { enabled: false },
    });
  });
});

describe("cda config persistence", () => {
  it("writes minimal overrides when toggling optional constraints", async () => {
    const cwd = await createTempProject();
    const runInteractive = vi.fn(async (state) => {
      const updated = state.map((entry) => {
        if (entry.id === "optional-enabled") {
          return { ...entry, effectiveEnabled: true };
        }
        if (entry.id === "optional-disabled") {
          return { ...entry, effectiveEnabled: true };
        }
        return entry;
      });
      return { status: "saved", state: updated };
    });

    await runConfigCommand([], {
      cwd,
      constraintsDir: OPTIONAL_CONSTRAINTS,
      stdin: createMockStdin(true),
      stdout: createMockStdout(true),
      runInteractive,
    });

    const raw = await readFile(path.join(cwd, "cda.config.json"), "utf8");
    const parsed = JSON.parse(raw);
    expect(parsed.constraint_overrides).toEqual({
      "optional-disabled": { enabled: true },
    });
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringMatching(/Updated cda\.config\.json/),
    );
  });

  it("leaves the config untouched when the session is cancelled", async () => {
    const cwd = await createTempProject();
    const original = await readFile(path.join(cwd, "cda.config.json"), "utf8");
    const runInteractive = vi.fn(async () => ({ status: "cancelled" }));

    await runConfigCommand([], {
      cwd,
      constraintsDir: OPTIONAL_CONSTRAINTS,
      stdin: createMockStdin(true),
      stdout: createMockStdout(true),
      runInteractive,
    });

    const updated = await readFile(path.join(cwd, "cda.config.json"), "utf8");
    expect(updated).toBe(original);
    expect(logSpy).toHaveBeenCalledWith("Exited without saving changes.");
  });

  it("rejects saving when all constraints are disabled", async () => {
    const cwd = await createTempProject();
    const original = await readFile(path.join(cwd, "cda.config.json"), "utf8");

    await expect(
      runConfigCommand([], {
        cwd,
        constraintsDir: OPTIONAL_CONSTRAINTS,
        stdin: createMockStdin(true),
        stdout: createMockStdout(true),
        runInteractive: async (state) => ({
          status: "saved",
          state: state.map((entry) => ({ ...entry, effectiveEnabled: false })),
        }),
      }),
    ).rejects.toThrow(/At least one constraint must remain active/);

    const updated = await readFile(path.join(cwd, "cda.config.json"), "utf8");
    expect(updated).toBe(original);
  });
});

function createMockStdin(isTTY: boolean): NodeJS.ReadStream {
  const emitter = new EventEmitter();
  const stdin = emitter as NodeJS.ReadStream;
  (stdin as NodeJS.ReadStream).isTTY = isTTY;
  stdin.setRawMode = () => {};
  stdin.resume = () => stdin;
  stdin.pause = () => stdin;
  return stdin;
}

function createMockStdout(isTTY: boolean): NodeJS.WriteStream {
  return {
    isTTY,
    rows: 40,
    columns: 120,
    write: () => true,
  } as unknown as NodeJS.WriteStream;
}

interface TempProjectOptions {
  writeConfig?: boolean;
  configContents?: string;
}

async function createTempProject(
  options: TempProjectOptions = {},
): Promise<string> {
  const { writeConfig = true, configContents } = options;
  const cwd = await mkdtemp(TMP_PREFIX);
  tempDirs.push(cwd);
  if (writeConfig) {
    const config =
      configContents ?? (await readFile(FIXTURE_CONFIG_PATH, "utf8"));
    await writeFile(path.join(cwd, "cda.config.json"), config, "utf8");
  }
  return cwd;
}
