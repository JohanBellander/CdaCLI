import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/cli/commands/run.js", () => ({
  runRunCommand: vi.fn().mockResolvedValue(undefined),
}));

import {
  runLegacyAgentCommand,
  runLegacyValidateCommand,
} from "../../src/cli/legacyWrappers.js";
import { runRunCommand } from "../../src/cli/commands/run.js";

describe("legacy CLI wrappers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("routes validate invocations through cda run", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    await runLegacyValidateCommand(["--constraint", "mvc"]);
    expect(runRunCommand).toHaveBeenCalledWith(["--constraint", "mvc"]);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("cda validate"),
    );
    warnSpy.mockRestore();
  });

  it("routes agent exec invocations through cda run --exec", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    await runLegacyAgentCommand(["--agent", "copilot"]);
    expect(runRunCommand).toHaveBeenCalledWith(["--exec", "--agent", "copilot"]);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("cda agent"),
    );
    warnSpy.mockRestore();
  });

  it("routes agent dry-run invocations through cda run --plan", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    await runLegacyAgentCommand(["--dry-run", "--constraint", "mvc"]);
    expect(runRunCommand).toHaveBeenCalledWith([
      "--plan",
      "--constraint",
      "mvc",
    ]);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("cda agent --dry-run"),
    );
    warnSpy.mockRestore();
  });

  it("preserves help flags when delegating agent command", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    await runLegacyAgentCommand(["--help"]);
    expect(runRunCommand).toHaveBeenCalledWith(["--exec", "--help"]);
    warnSpy.mockRestore();
  });
});
