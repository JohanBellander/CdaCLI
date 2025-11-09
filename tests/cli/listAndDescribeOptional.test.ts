import path from "node:path";

import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

import { runListCommand } from "../../src/cli/commands/list.js";
import { runDescribeCommand } from "../../src/cli/commands/describe.js";

const OPTIONAL_PROJECT = path.resolve(
  "tests/fixtures/projects/optional/some-disabled",
);
const OPTIONAL_CONSTRAINTS = path.resolve("tests/fixtures/optional-constraints");

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

describe("cda list optional constraint UX", () => {
  it("prints status column with optional-enabled/disabled states", async () => {
    await runListCommand({
      cwd: OPTIONAL_PROJECT,
      constraintsDir: OPTIONAL_CONSTRAINTS,
    });

    const output = logSpy.mock.calls
      .map((call: unknown[]) => String(call[0]))
      .join("\n");
    expect(output).toContain("STATUS");
    expect(output).toContain("optional-enabled");
    expect(output).toContain("optional-disabled");
    expect(output).toContain("active");
  });
});

describe("cda describe optional guardrails", () => {
  it("rejects describe requests for disabled optional constraints", async () => {
    await expect(
      runDescribeCommand(["optional-enabled"], {
        cwd: OPTIONAL_PROJECT,
        constraintsDir: OPTIONAL_CONSTRAINTS,
      }),
    ).rejects.toThrow(/is disabled/);
  });
});
