import { describe, expect, it } from "vitest";

import { generateRunId } from "../src/core/runId.js";

describe("generateRunId", () => {
  it("produces ISO timestamp prefix and base36 suffix", () => {
    const now = new Date("2025-11-07T12:00:00.000Z");
    const runId = generateRunId({
      now,
      random: () => 0.25, // deterministic
    });
    expect(runId).toMatch(
      /^2025-11-07T12:00:00\.000Z-[0-9a-z]{6}$/,
    );
    const expectedSuffix = Math.floor(0.25 * 36 ** 6)
      .toString(36)
      .padStart(6, "0");
    expect(runId.endsWith(expectedSuffix)).toBe(true);
  });
});
