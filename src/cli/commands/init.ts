import { access, writeFile } from "node:fs/promises";
import path from "node:path";

import { loadConstraints } from "../../core/constraintLoader.js";
import { buildCdaGuide } from "../../core/cdaGuideBuilder.js";
import { createError } from "../../core/errors.js";

export interface InitCommandOptions {
  cwd?: string;
}

export async function runInitCommand(
  options: InitCommandOptions = {},
): Promise<void> {
  const cwd = options.cwd ?? process.cwd();
  const configPath = path.join(cwd, "cda.config.json");
  const guidePath = path.join(cwd, "CDA.md");

  if (await fileExists(configPath)) {
    throw createError(
      "CONFIG_ERROR",
      "cda.config.json already exists in this directory.",
    );
  }

  const constraints = await loadConstraints();
  const configPayload = JSON.stringify(
    { version: 1, constraints: "builtin" },
    null,
    2,
  );

  await writeFile(configPath, `${configPayload}\n`, "utf8");
  const guideContent = buildCdaGuide(constraints);
  await writeFile(guidePath, guideContent, "utf8");

  console.log("Created cda.config.json and CDA.md");
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}
