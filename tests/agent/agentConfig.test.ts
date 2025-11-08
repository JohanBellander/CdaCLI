// Beads-Test: CDATool-619 CDATool-7pl

import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  loadAgentConfig,
  resolveAgent,
} from "../../src/core/agentConfig.js";

const fixturesDir = path.resolve("tests/fixtures/agents");

describe("agentConfig loader", () => {
  it("loads and normalizes a valid config", async () => {
    const config = await loadAgentConfig({
      cwd: path.join(fixturesDir, "valid"),
    });

    expect(config).not.toBeNull();
    expect(config?.defaultAgent).toBe("copilot");
    expect(Object.keys(config?.agents ?? {})).toEqual(["copilot", "echo"]);

    const copilot = config!.agents.copilot;
    expect(copilot.command).toBe("copilot");
    expect(copilot.args).toEqual(["--model", "gpt-5", "--allow-all-tools"]);
    expect(copilot.mode).toBe("arg");
    expect(copilot.promptArgFlag).toBe("-p");
    expect(copilot.promptFileArg).toBe("--prompt-file");
    expect(copilot.promptPreamble).toMatch(/verification agent/i);
    expect(copilot.postscript).toMatch(/Return ONLY/i);
    expect(copilot.maxLength).toBe(20000);
    expect(copilot.agentModel).toBe("gpt-5");
  });

  it("returns null when file missing and required=false", async () => {
    const result = await loadAgentConfig({
      cwd: path.join(fixturesDir, "empty"),
      required: false,
    });
    expect(result).toBeNull();
  });

  it("throws when file missing and required defaults to true", async () => {
    await expect(
      loadAgentConfig({ cwd: path.join(fixturesDir, "empty") }),
    ).rejects.toThrow(/Agent config not found/i);
  });

  it("throws on invalid JSON", async () => {
    await expect(
      loadAgentConfig({ cwd: path.join(fixturesDir, "invalid-json") }),
    ).rejects.toThrow(/Invalid JSON/i);
  });

  it("throws when agents map is empty", async () => {
    await expect(
      loadAgentConfig({ cwd: path.join(fixturesDir, "no-agents") }),
    ).rejects.toThrow(/define at least one agent/i);
  });

  it("throws when agent mode unsupported", async () => {
    await expect(
      loadAgentConfig({ cwd: path.join(fixturesDir, "unsupported-mode") }),
    ).rejects.toThrow(/unsupported agent mode/i);
  });

  it("throws when args is not an array of strings", async () => {
    await expect(
      loadAgentConfig({ cwd: path.join(fixturesDir, "invalid-args") }),
    ).rejects.toThrow(/must be an array of strings/i);
  });

  it("throws when default references unknown agent", async () => {
    await expect(
      loadAgentConfig({ cwd: path.join(fixturesDir, "bad-default") }),
    ).rejects.toThrow(/references unknown agent/i);
  });
});

describe("resolveAgent", () => {
  it("prefers requested agent when provided", async () => {
    const config = await loadAgentConfig({
      cwd: path.join(fixturesDir, "valid"),
    });
    const resolved = resolveAgent(config!, "echo");
    expect(resolved.agentName).toBe("echo");
    expect(resolved.definition.command).toBe("echo");
  });

  it("falls back to default agent when none requested", async () => {
    const config = await loadAgentConfig({
      cwd: path.join(fixturesDir, "valid"),
    });
    const resolved = resolveAgent(config!);
    expect(resolved.agentName).toBe("copilot");
  });

  it("falls back to copilot when default missing but agent exists", () => {
    const config = {
      path: "virtual",
      agents: {
        copilot: {
          name: "copilot",
          command: "gh",
          args: [],
          mode: "stdin" as const,
        },
      },
    };
    const resolved = resolveAgent(config);
    expect(resolved.agentName).toBe("copilot");
  });

  it("throws when requested agent missing", async () => {
    const config = await loadAgentConfig({
      cwd: path.join(fixturesDir, "valid"),
    });
    expect(() => resolveAgent(config!, "missing")).toThrow(/Unknown agent/);
  });

  it("throws when no default and no copilot available", () => {
    const config = {
      path: "virtual",
      agents: {
        echo: {
          name: "echo",
          command: "echo",
          args: [],
          mode: "stdin" as const,
        },
      },
    };
    expect(() => resolveAgent(config)).toThrow(/Specify --agent/);
  });
});
