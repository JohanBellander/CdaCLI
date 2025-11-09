import path from "node:path";

import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";

import { runValidateCommand } from "../../src/cli/commands/validate.js";

const OPTIONAL_CONSTRAINTS = path.resolve("tests/fixtures/optional-constraints");
const OPTIONAL_ONLY = path.resolve("tests/fixtures/optional-constraints-only");
const SOME_DISABLED_PROJECT = path.resolve(
  "tests/fixtures/projects/optional/some-disabled",
);
const ALL_DISABLED_PROJECT = path.resolve(
  "tests/fixtures/projects/optional/all-disabled",
);

let logSpy: ReturnType<typeof vi.spyOn>;
let errorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  logSpy.mockRestore();
  errorSpy.mockRestore();
});

describe("runValidateCommand optional constraint handling", () => {
  it("logs skipped optional constraints and filters output", async () => {
    await runValidateCommand([], {
      cwd: SOME_DISABLED_PROJECT,
      constraintsDir: OPTIONAL_CONSTRAINTS,
    });

    expect(errorSpy).toHaveBeenCalledWith(
      "Constraint 'optional-enabled' disabled via configuration.",
    );
    const output = logSpy.mock.calls
      .map((call: unknown[]) => String(call[0]))
      .join("\n");
    expect(output).toContain("optional-disabled");
    expect(output).not.toContain("optional-enabled");
  });

  it("throws when configuration disables every active constraint", async () => {
    await expect(
      runValidateCommand([], {
        cwd: ALL_DISABLED_PROJECT,
        constraintsDir: OPTIONAL_ONLY,
      }),
    ).rejects.toThrow(/No active constraints available/);
  });

  it("rejects explicit requests for disabled constraints", async () => {
    await expect(
      runValidateCommand(["--constraint", "optional-enabled"], {
        cwd: SOME_DISABLED_PROJECT,
        constraintsDir: OPTIONAL_CONSTRAINTS,
      }),
    ).rejects.toThrow(/is disabled/);
  });
});
