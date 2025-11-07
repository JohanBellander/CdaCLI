import { describe, expect, it } from "vitest";

import {
  CdaError,
  createError,
  getExitCode,
  isCdaError,
} from "../src/core/errors.js";

describe("errors", () => {
  it("creates typed errors for every code", () => {
    const codes = ["FATAL", "CONFIG_ERROR", "BUNDLE_ERROR", "IO_ERROR"] as const;
    codes.forEach((code) => {
      const error = createError(code, "boom");
      expect(error).toBeInstanceOf(CdaError);
      expect(error.code).toBe(code);
      expect(error.exitCode).toBe(1);
      expect(isCdaError(error)).toBe(true);
    });
  });

  it("includes provided cause", () => {
    const cause = new Error("root");
    const error = createError("IO_ERROR", "wrap", { cause });
    expect(error.cause).toBe(cause);
  });

  it("maps arbitrary errors to exit code 1", () => {
    expect(getExitCode(createError("FATAL", "fail"))).toBe(1);
    expect(getExitCode(new Error("fail"))).toBe(1);
  });
});
