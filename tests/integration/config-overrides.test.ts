import { describe, it, expect, beforeEach, afterEach } from "vitest";
import path from "node:path";
import { writeFile, mkdir, rm } from "node:fs/promises";
import { loadProjectConfig } from "../../src/core/projectConfig.js";
import { loadConstraints, partitionConstraints } from "../../src/core/constraintLoader.js";

const FIXTURES_DIR = path.resolve("tests/fixtures/projects/with-mvc-disabled");

describe("MVC/MVP config override integration", () => {
  it("respects constraint_overrides from cda.config.json", async () => {
    // Load project config
    const projectConfig = await loadProjectConfig({
      cwd: FIXTURES_DIR,
      required: false,
    });
    
    expect(projectConfig).toBeDefined();
    expect(projectConfig?.constraintOverrides).toEqual({
      "mvc-layer-separation": { enabled: false },
      "mvp-presenter-boundaries": { enabled: false },
    });
    
    // Load constraints with overrides
    const constraints = await loadConstraints({
      constraintOverrides: projectConfig?.constraintOverrides,
    });
    
    const { active, disabled } = partitionConstraints(constraints);
    
    // MVC and MVP should be in disabled list
    const mvcDisabled = disabled.find((c) => c.meta.id === "mvc-layer-separation");
    const mvpDisabled = disabled.find((c) => c.meta.id === "mvp-presenter-boundaries");
    
    expect(mvcDisabled).toBeDefined();
    expect(mvpDisabled).toBeDefined();
    
    // They should NOT be in active list
    const mvcActive = active.find((c) => c.meta.id === "mvc-layer-separation");
    const mvpActive = active.find((c) => c.meta.id === "mvp-presenter-boundaries");
    
    expect(mvcActive).toBeUndefined();
    expect(mvpActive).toBeUndefined();
  });
  
  it("loads MVC/MVP as disabled by default without config", async () => {
    const constraints = await loadConstraints();
    const { active, disabled } = partitionConstraints(constraints);
    
    // Without config, MVC and MVP should already be disabled
    const mvcDisabled = disabled.find((c) => c.meta.id === "mvc-layer-separation");
    const mvpDisabled = disabled.find((c) => c.meta.id === "mvp-presenter-boundaries");
    
    expect(mvcDisabled).toBeDefined();
    expect(mvpDisabled).toBeDefined();
  });
});
