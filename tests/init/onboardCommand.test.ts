import { describe, expect, it, afterEach } from "vitest";
import path from "node:path";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";

import { runOnboardCommand } from "../../src/cli/commands/onboard.js";

const TMP_PREFIX = path.join(tmpdir(), "cda-onboard-");

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

describe("cda onboard command", () => {
  it("writes the minimal onboarding checklist to CDA.md", async () => {
    const cwd = await createTempDir();

    await runOnboardCommand([], { cwd });

    const guide = await readFile(path.join(cwd, "CDA.md"), "utf8");
    expect(guide).toMatch(/STOP - Mandatory Command Sequence/);
    expect(guide).toMatch(/cda run --plan/);
    expect(guide).toMatch(/cda run --exec/);
    expect(guide).toMatch(/Evidence Checklist/);
  });

  it("refuses to overwrite an existing guide without --overwrite", async () => {
    const cwd = await createTempDir();
    const guidePath = path.join(cwd, "CDA.md");
    await writeFile(guidePath, "existing\n");

    await expect(runOnboardCommand([], { cwd })).rejects.toMatchObject({
      code: "CONFIG_ERROR",
    });
  });

  it("supports custom output paths", async () => {
    const cwd = await createTempDir();
    await runOnboardCommand(["--output", "docs/onboarding.md"], { cwd });

    const guide = await readFile(path.join(cwd, "docs", "onboarding.md"), "utf8");
    expect(guide).toMatch(/STOP - Mandatory Command Sequence/);
  });
});
