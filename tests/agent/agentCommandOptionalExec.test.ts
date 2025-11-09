import path from "node:path";
import { EventEmitter } from "node:events";

import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";

import { runAgentCommand } from "../../src/cli/commands/agent.js";

const spawnMock = vi.fn(
  (
    _command: string,
    _args: string[],
    _options: { stdio: ("ignore" | "pipe" | "inherit")[] },
  ) => {
    const child = new EventEmitter();
    (child as { stdin?: null }).stdin = null;
    setImmediate(() => {
      child.emit("spawn");
      setImmediate(() => child.emit("close", 0));
    });
    return child;
  },
);

vi.mock("node:child_process", () => ({
  spawn: (...args: Parameters<typeof spawnMock>) => spawnMock(...args),
}));

const OPTIONAL_PROJECT = path.resolve(
  "tests/fixtures/projects/optional/some-disabled",
);
const OPTIONAL_CONSTRAINTS = path.resolve(
  "tests/fixtures/optional-constraints",
);

let errorSpy: ReturnType<typeof vi.spyOn>;

describe("cda agent optional constraint logging (exec mode)", () => {
  beforeEach(() => {
    spawnMock.mockClear();
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it("logs skipped constraints to stderr when executing agents", async () => {
    await runAgentCommand([], {
      cwd: OPTIONAL_PROJECT,
      constraintsDir: OPTIONAL_CONSTRAINTS,
    });

    expect(errorSpy).toHaveBeenCalledWith(
      "Constraint 'optional-enabled' skipped (disabled by configuration).",
    );
    expect(spawnMock).toHaveBeenCalled();
  });
});
