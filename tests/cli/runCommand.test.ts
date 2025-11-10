import { describe, expect, it, beforeEach, vi } from "vitest";

vi.mock("../../src/cli/commands/validate.js", () => ({
  runValidateCommand: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../../src/cli/commands/agent.js", () => ({
  runAgentCommand: vi.fn().mockResolvedValue(undefined),
}));

import { runRunCommand } from "../../src/cli/commands/run.js";
import { runValidateCommand } from "../../src/cli/commands/validate.js";
import { runAgentCommand } from "../../src/cli/commands/agent.js";

describe("runRunCommand", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("delegates to validate by default", async () => {
    await runRunCommand([], { cwd: "/tmp/default" });
    expect(runValidateCommand).toHaveBeenCalledWith([], { cwd: "/tmp/default" });
    expect(runAgentCommand).not.toHaveBeenCalled();
  });

  it("delegates to agent command in plan mode with dry-run flags", async () => {
    await runRunCommand(
      [
        "--plan",
        "--constraint",
        "mvc-layer-separation",
        "--agent",
        "echo",
        "--output",
        "prompt.txt",
        "--legacy-format",
      ],
      { cwd: "/tmp/project" },
    );

    expect(runAgentCommand).toHaveBeenCalledWith(
      [
        "--constraint",
        "mvc-layer-separation",
        "--agent",
        "echo",
        "--output",
        "prompt.txt",
        "--legacy-format",
        "--dry-run",
      ],
      { cwd: "/tmp/project" },
    );
    expect(runValidateCommand).not.toHaveBeenCalled();
  });

  it("delegates to agent command in exec mode", async () => {
    await runRunCommand(["--exec", "--agent", "copilot"], { cwd: "/tmp/project" });
    expect(runAgentCommand).toHaveBeenCalledWith(
      ["--agent", "copilot"],
      { cwd: "/tmp/project" },
    );
  });

  it("rejects invalid mode combinations", async () => {
    await expect(runRunCommand(["--plan", "--exec"])).rejects.toThrow(/one of --plan, --exec, or --audit/);
  });

  it("rejects invalid constraint/sequential combo", async () => {
    await expect(
      runRunCommand(["--constraint", "mvc-layer-separation", "--sequential"]),
    ).rejects.toThrow(/either --constraint or --sequential/);
  });

  it("rejects agent flag outside applicable modes", async () => {
    await expect(runRunCommand(["--agent", "copilot"])).rejects.toThrow(/plan, --exec, or --audit/);
  });

  it("rejects --output outside plan/exec modes", async () => {
    await expect(runRunCommand(["--output", "prompt.txt"])).rejects.toThrow(/only be used with --plan or --exec/);
  });
});
