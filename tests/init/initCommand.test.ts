// Beads-Test: CDATool-m8x CDATool-juc

import { describe, expect, it, afterEach } from "vitest";
import path from "node:path";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";

import { runInitCommand } from "../../src/cli/commands/init.js";
import { loadConstraints } from "../../src/core/constraintLoader.js";

const TMP_PREFIX = path.join(tmpdir(), "cda-init-");

const tempDirs: string[] = [];

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  }
});

async function createTempDir(): Promise<string> {
  const dir = await mkdtemp(TMP_PREFIX);
  tempDirs.push(dir);
  return dir;
}

describe("cda init command", () => {
  it("creates config, second-person CDA.md, and default agent file", async () => {
    const cwd = await createTempDir();
    await runInitCommand([], { cwd });

    const configRaw = await readFile(path.join(cwd, "cda.config.json"), "utf8");
    const config = JSON.parse(configRaw);
    expect(config.constraint_overrides).toEqual({});

    const guide = await readFile(path.join(cwd, "CDA.md"), "utf8");
    expect(guide).toMatch(/You MUST/);
    expect(guide).toMatch(/High-Level Purpose/);
    expect(guide).toMatch(/Validation Checklist/);

    const agentConfigRaw = await readFile(
      path.join(cwd, "cda.agents.json"),
      "utf8",
    );
    const agentConfig = JSON.parse(agentConfigRaw);
  expect(agentConfig.default).toBe("copilot-stdin");
    expect(agentConfig.agents.echo).toBeDefined();
  });

  it("skips agent config when --no-agents is supplied", async () => {
    const cwd = await createTempDir();
    await runInitCommand(["--no-agents"], { cwd });

    await expect(
      readFile(path.join(cwd, "cda.agents.json"), "utf8"),
    ).rejects.toThrow();
  });

  it("leaves existing agent config untouched", async () => {
    const cwd = await createTempDir();
    const agentsPath = path.join(cwd, "cda.agents.json");
    await writeFile(agentsPath, `{"agents":{"custom":{"command":"echo","args":[],"mode":"stdin"}}}`);

    await runInitCommand([], { cwd });

    const result = await readFile(agentsPath, "utf8");
    expect(result).toContain("custom");
  });
});
