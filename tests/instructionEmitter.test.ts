import path from "node:path";

import { describe, expect, it } from "vitest";

import { loadConstraints } from "../src/core/constraintLoader.js";
import {
  buildBatchInstructionPackage,
  buildSingleInstructionPackage,
} from "../src/core/instructionEmitter.js";

const SOURCE_CONSTRAINTS = path.resolve("src/constraints/core");

describe("instructionEmitter", () => {
  it("creates batch package snapshot", async () => {
    const constraints = await loadConstraints({
      constraintsDir: SOURCE_CONSTRAINTS,
    });
    const pkg = buildBatchInstructionPackage({
      runId: "snapshot-run",
      constraints,
    });
    expect(pkg).toMatchSnapshot();
  });

  it("creates single package snapshot", async () => {
    const constraints = await loadConstraints({
      constraintsDir: SOURCE_CONSTRAINTS,
    });
    const target = constraints[0];
    const pkg = buildSingleInstructionPackage({
      runId: "snapshot-run",
      constraint: target,
    });
    expect(pkg).toMatchSnapshot();
  });
});
