// Beads: CDATool-kmz CDATool-4e1 CDATool-8nj CDATool-qpa CDATool-6md CDATool-ga7 CDATool-87t CDATool-80h

import { writeFile } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

import { loadConstraints } from "../../core/constraintLoader.js";
import {
  buildBatchInstructionPackage,
  buildSingleInstructionPackage,
} from "../../core/instructionEmitter.js";
import {
  formatBatchInstructionPackage,
  formatLegacyBatchInstructionPackage,
  formatLegacySingleInstructionPackage,
  formatSingleInstructionPackage,
} from "../formatters.js";
import {
  loadAgentConfig,
  resolveAgent,
  AgentDefinition,
} from "../../core/agentConfig.js";
import { assemblePrompt } from "../../core/promptAssembler.js";
import { generateRunId } from "../../core/runId.js";
import { createError } from "../../core/errors.js";

interface AgentCommandOptions {
  cwd?: string;
}

interface ParsedAgentArgs {
  constraintId?: string;
  sequential: boolean;
  agentName?: string;
  dryRun: boolean;
  noExec: boolean;
  outputPath?: string;
  legacyFormat: boolean;
  helpRequested: boolean;
}

export async function runAgentCommand(
  argv: string[] = [],
  options: AgentCommandOptions = {},
): Promise<void> {
  const parsed = parseAgentArgs(argv);
  if (parsed.helpRequested) {
    printAgentHelp();
    return;
  }

  const cwd = options.cwd ?? process.cwd();
  const constraints = await loadConstraints();
  const runId = generateRunId();
  const { instructionText, constraintIdUsed } = buildInstructionText({
    constraints,
    explicitConstraintId: parsed.constraintId,
    sequential: parsed.sequential,
    legacyFormat: parsed.legacyFormat,
    runId,
  });
  const config = await loadAgentConfig({ cwd, required: false });

  let missingConfigWarning: string | null = null;
  let agentDefinition: AgentDefinition | null = null;
  let agentName = parsed.agentName ?? "unspecified";
  if (config) {
    const resolved = resolveAgent(config, parsed.agentName);
    agentDefinition = resolved.definition;
    agentName = resolved.agentName;
  } else {
    missingConfigWarning =
      "WARNING: No cda.agents.json found. Use --dry-run to inspect prompts or run `cda validate`.";
  }

  const promptResult = assemblePrompt({
    runId,
    agentName,
    agentModel: agentDefinition?.agentModel,
    instructionText,
    promptPreamble: agentDefinition?.promptPreamble,
    postscript: agentDefinition?.postscript,
    legacyFormat: parsed.legacyFormat,
  });

  if (agentDefinition?.maxLength && promptResult.charCount > agentDefinition.maxLength) {
    throw createError(
      "CONFIG_ERROR",
      `Prompt length ${promptResult.charCount} exceeds max_length ${agentDefinition.maxLength}.`,
    );
  }

  if (parsed.outputPath) {
    const absoluteOutput = path.resolve(cwd, parsed.outputPath);
    await writeFile(absoluteOutput, `${promptResult.prompt}\n`, "utf8");
    console.log(`Prompt written to ${absoluteOutput}`);
  }

  if (missingConfigWarning) {
    console.warn(missingConfigWarning);
  }

  const displayPrompt = () => {
    console.log(promptResult.prompt);
  };

  const commandLine =
    agentDefinition &&
    [agentDefinition.command, ...agentDefinition.args]
      .map((part) => formatArg(part))
      .join(" ");

  if (parsed.noExec || !agentDefinition) {
    if (parsed.dryRun && commandLine && !parsed.noExec) {
      console.log(`AGENT COMMAND: ${commandLine}`);
      console.log("");
    }
    displayPrompt();
    return;
  }

  if (parsed.dryRun) {
    console.log(`AGENT COMMAND: ${commandLine}`);
    console.log("");
    displayPrompt();
    return;
  }

  await executeAgentCommand({
    definition: agentDefinition,
    prompt: promptResult.prompt,
    constraintIdUsed,
  });
}

async function executeAgentCommand(options: {
  definition: AgentDefinition;
  prompt: string;
  constraintIdUsed?: string;
}): Promise<void> {
  const child = spawn(options.definition.command, options.definition.args, {
    stdio: ["pipe", "inherit", "inherit"],
  });

  child.stdin.write(options.prompt);
  child.stdin.end();

  const exitCode: number = await new Promise((resolve, reject) => {
    child.once("error", (error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") {
        reject(
          createError(
            "FATAL",
            `Unable to spawn '${options.definition.command}'. Is it installed?`,
          ),
        );
        return;
      }
      reject(error);
    });
    child.once("close", (code) => resolve(code ?? 0));
  });

  // Specification states that we do not alter exit code based on child result.
  if (exitCode !== 0) {
    console.warn(
      `Agent command exited with code ${exitCode}. CDA agent finished without interpreting the response.`,
    );
  }
}

function buildInstructionText({
  constraints,
  explicitConstraintId,
  sequential,
  legacyFormat,
  runId,
}: {
  constraints: Awaited<ReturnType<typeof loadConstraints>>;
  explicitConstraintId?: string;
  sequential: boolean;
  legacyFormat: boolean;
  runId: string;
}): { instructionText: string; constraintIdUsed?: string } {
  const selectedConstraints = constraints;

  if (explicitConstraintId) {
    const match = selectedConstraints.find(
      (constraint) => constraint.meta.id === explicitConstraintId,
    );
    if (!match) {
      throw createError(
        "CONFIG_ERROR",
        `Unknown constraint '${explicitConstraintId}'.`,
      );
    }
    const pkg = buildSingleInstructionPackage({
      runId,
      constraint: match,
    });
    const formatter = legacyFormat
      ? formatLegacySingleInstructionPackage
      : formatSingleInstructionPackage;
    return {
      instructionText: formatter(pkg),
      constraintIdUsed: explicitConstraintId,
    };
  }

  if (sequential) {
    const first = selectedConstraints[0];
    if (!first) {
      throw createError("CONFIG_ERROR", "No constraints available.");
    }
    const pkg = buildSingleInstructionPackage({
      runId,
      constraint: first,
    });
    const formatter = legacyFormat
      ? formatLegacySingleInstructionPackage
      : formatSingleInstructionPackage;
    return {
      instructionText: formatter(pkg),
      constraintIdUsed: first.meta.id,
    };
  }

  const pkg = buildBatchInstructionPackage({
    runId,
    constraints: selectedConstraints,
  });
  const formatter = legacyFormat
    ? formatLegacyBatchInstructionPackage
    : formatBatchInstructionPackage;
  return {
    instructionText: formatter(pkg),
  };
}

function parseAgentArgs(args: string[]): ParsedAgentArgs {
  const parsed: ParsedAgentArgs = {
    sequential: false,
    dryRun: false,
    noExec: false,
    legacyFormat: false,
    helpRequested: false,
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    switch (arg) {
      case "--help":
      case "-h": {
        parsed.helpRequested = true;
        return parsed;
      }
      case "--constraint":
      case "-c": {
        const next = args[i + 1];
        if (!next) {
          throw createError(
            "CONFIG_ERROR",
            "Expected constraint id after --constraint.",
          );
        }
        parsed.constraintId = next;
        i += 1;
        break;
      }
      case "--sequential": {
        parsed.sequential = true;
        break;
      }
      case "--agent": {
        const next = args[i + 1];
        if (!next) {
          throw createError(
            "CONFIG_ERROR",
            "Expected agent name after --agent.",
          );
        }
        parsed.agentName = next;
        i += 1;
        break;
      }
      case "--dry-run": {
        parsed.dryRun = true;
        break;
      }
      case "--no-exec": {
        parsed.noExec = true;
        parsed.dryRun = true;
        break;
      }
      case "--output": {
        const next = args[i + 1];
        if (!next) {
          throw createError(
            "CONFIG_ERROR",
            "Expected path after --output.",
          );
        }
        parsed.outputPath = next;
        i += 1;
        break;
      }
      case "--legacy-format": {
        parsed.legacyFormat = true;
        break;
      }
      default: {
        throw createError("CONFIG_ERROR", `Unknown option '${arg}'. Use --help for usage.`);
      }
    }
  }

  if (parsed.constraintId && parsed.sequential) {
    throw createError(
      "CONFIG_ERROR",
      "Use either --constraint or --sequential, not both.",
    );
  }

  return parsed;
}

function printAgentHelp(): void {
  console.log("Usage: cda agent [options]");
  console.log("");
  console.log("Options:");
  console.log("  --agent <name>       Select agent defined in cda.agents.json");
  console.log("  --constraint <id>    Emit single-constraint instructions");
  console.log("  --sequential         Shortcut for first recommended constraint");
  console.log("  --dry-run            Print prompt and intended command without executing");
  console.log("  --no-exec            Print prompt only (implies --dry-run)");
  console.log("  --output <path>      Write prompt to file");
  console.log("  --legacy-format      Use legacy instruction formatting");
  console.log("  --help               Show this message");
}

function formatArg(arg: string): string {
  if (/[\s"]/u.test(arg)) {
    return `"${arg.replace(/"/g, '\\"')}"`;
  }
  return arg;
}
