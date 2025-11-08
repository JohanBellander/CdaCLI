// Beads: CDATool-kmz CDATool-4e1 CDATool-8nj CDATool-qpa CDATool-6md CDATool-ga7 CDATool-87t CDATool-80h

import { writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { spawn, type ChildProcess } from "node:child_process";

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

interface AgentCommandPlan {
  args: string[];
  promptDelivery: "stdin" | "arg-inline" | "arg-file";
  promptFilePath?: string;
  inlineLengthMetadata?: {
    limit: number;
    estimatedLength: number;
  };
}

type AgentSpawnStdio = ["ignore" | "pipe", "inherit", "inherit"];

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

  const plan =
    agentDefinition &&
    buildAgentCommandPlan({
      definition: agentDefinition,
      prompt: promptResult.prompt,
      runId,
    });

  if (plan?.promptDelivery === "arg-file" && plan.promptFilePath) {
    const limitInfo = plan.inlineLengthMetadata;
    const limitText = limitInfo ? `${limitInfo.limit}` : "8192";
    const estimatedText = limitInfo ? `${limitInfo.estimatedLength}` : `${promptResult.charCount}`;
    console.log(
      `Prompt length ${estimatedText} exceeds Windows inline argument limit (~${limitText}). Using prompt file ${plan.promptFilePath}.`,
    );
  }

  const displayPrompt = () => {
    console.log(promptResult.prompt);
  };

  const previewArgs = plan?.args;
  const commandLine =
    agentDefinition && previewArgs
      ? [agentDefinition.command, ...previewArgs].map((part) => formatArg(part)).join(" ")
      : null;

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
    plan: plan!,
  });
}

async function executeAgentCommand(options: {
  definition: AgentDefinition;
  prompt: string;
  plan: AgentCommandPlan;
}): Promise<void> {
  const execArgs = options.plan.args;
  let promptFileToCleanup: string | null = null;
  if (
    options.plan.promptDelivery === "arg-file" &&
    options.plan.promptFilePath
  ) {
    await writeFile(options.plan.promptFilePath, options.prompt, "utf8");
    promptFileToCleanup = options.plan.promptFilePath;
  }

  const stdio: AgentSpawnStdio =
    options.definition.mode === "arg"
      ? ["ignore", "inherit", "inherit"]
      : ["pipe", "inherit", "inherit"];

  try {
    const { child } = await spawnWithFallback({
      command: options.definition.command,
      args: execArgs,
      stdio,
    });

    if (options.definition.mode === "stdin" && child.stdin) {
      child.stdin.write(options.prompt);
      child.stdin.end();
    }

    const exitCode: number = await new Promise((resolve, reject) => {
      child.once("error", (error: NodeJS.ErrnoException) => {
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
  } finally {
    if (promptFileToCleanup) {
      try {
        await unlink(promptFileToCleanup);
      } catch {
        // ignore cleanup failures
      }
    }
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

function buildAgentCommandPlan({
  definition,
  prompt,
  runId,
}: {
  definition: AgentDefinition;
  prompt: string;
  runId: string;
}): AgentCommandPlan {
  const baseArgs = [...definition.args];
  if (definition.mode === "stdin") {
    return {
      args: baseArgs,
      promptDelivery: "stdin",
    };
  }

  const promptArgFlag = definition.promptArgFlag ?? "-p";
  const inlineArgs = [...baseArgs, promptArgFlag, prompt];
  const platform = resolvePlatform();

  if (platform === "win32") {
    const limit = getWindowsArgLimit();
    const estimatedLength = estimateCommandLength(
      definition.command,
      inlineArgs,
    );
    if (estimatedLength >= limit) {
      const promptFileArg = definition.promptFileArg ?? "--prompt-file";
      const promptFilePath = path.join(
        os.tmpdir(),
        `cda-agent-prompt-${sanitizeForFilename(runId)}.txt`,
      );
      return {
        args: [...baseArgs, promptFileArg, promptFilePath],
        promptDelivery: "arg-file",
        promptFilePath,
        inlineLengthMetadata: {
          limit,
          estimatedLength,
        },
      };
    }
  }

  return {
    args: inlineArgs,
    promptDelivery: "arg-inline",
  };
}

async function spawnWithFallback(options: {
  command: string;
  args: string[];
  stdio: AgentSpawnStdio;
}): Promise<{ child: ChildProcess }> {
  const candidates = buildCommandCandidates(options.command);
  let lastNonEnoentError: NodeJS.ErrnoException | null = null;

  for (const candidate of candidates) {
    try {
      console.error(`[DEBUG] Attempting spawn: ${candidate}`);
      console.error(`[DEBUG] Args (${options.args.length}):`, options.args.map((a, i) => `[${i}]=${a.substring(0, 50)}${a.length > 50 ? '...' : ''}`));
      const child = await attemptSpawn(candidate, options.args, options.stdio);
      return { child };
    } catch (error) {
      const nodeError = error as NodeJS.ErrnoException;
      console.error(`[DEBUG] Spawn failed: ${nodeError.code} - ${nodeError.message}`);
      if (nodeError.code === "ENOENT") {
        continue;
      }
      lastNonEnoentError = nodeError;
      break;
    }
  }

  if (lastNonEnoentError) {
    throw lastNonEnoentError;
  }

  const guidance = buildSpawnGuidance(options.command, candidates);
  throw createError("FATAL", guidance);
}

function attemptSpawn(
  command: string,
  args: string[],
  stdio: AgentSpawnStdio,
): Promise<ChildProcess> {
  return new Promise((resolve, reject) => {
    // On Windows, .cmd files must be spawned through cmd.exe
    const isWindows = resolvePlatform() === "win32";
    const isCmdFile = command.toLowerCase().endsWith(".cmd");
    
    let spawnCommand = command;
    let spawnArgs = args;
    
    if (isWindows && isCmdFile) {
      spawnCommand = "cmd.exe";
      spawnArgs = ["/c", command, ...args];
    }
    
    const child = spawn(spawnCommand, spawnArgs, { stdio });
    const cleanup = () => {
      child.removeListener("error", handleError);
      child.removeListener("spawn", handleSpawn);
    };
    const handleError = (error: NodeJS.ErrnoException) => {
      cleanup();
      reject(error);
    };
    const handleSpawn = () => {
      cleanup();
      resolve(child);
    };
    child.once("error", handleError);
    child.once("spawn", handleSpawn);
  });
}

function buildCommandCandidates(command: string): string[] {
  const candidates = [command];
  if (resolvePlatform() === "win32" && shouldAppendCmdFallback(command)) {
    candidates.push(`${command}.cmd`);
  }
  return candidates;
}

function shouldAppendCmdFallback(command: string): boolean {
  const base = path.basename(command);
  return !/\.[^\\/]+$/u.test(base);
}

function buildSpawnGuidance(
  command: string,
  attemptedCommands: string[],
): string {
  const attempts = attemptedCommands.join(", ");
  const verification =
    "Verify that the Copilot CLI is installed and on PATH (`where copilot` on Windows, `which copilot` on macOS/Linux), or set the absolute path in cda.agents.json.";
  const fallback =
    "Until it is installed, you can run `cda agent --agent echo --dry-run` or configure an agent that uses `mode: \"stdin\"` to stream prompts.";
  return `Unable to spawn '${command}'. Tried commands: ${attempts}. ${verification} ${fallback}`;
}

function estimateCommandLength(command: string, args: string[]): number {
  let length = command.length;
  for (const arg of args) {
    length += 1 + arg.length;
  }
  return length;
}

function resolvePlatform(): NodeJS.Platform {
  const override = process.env.CDA_PLATFORM_OVERRIDE;
  if (
    override === "aix" ||
    override === "darwin" ||
    override === "freebsd" ||
    override === "linux" ||
    override === "openbsd" ||
    override === "sunos" ||
    override === "win32"
  ) {
    return override;
  }
  return process.platform;
}

function getWindowsArgLimit(): number {
  const override = process.env.CDA_WINDOWS_ARG_LIMIT;
  if (override) {
    const parsed = Number.parseInt(override, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return 8000;
}

function sanitizeForFilename(value: string): string {
  return value.replace(/[^a-zA-Z0-9-_]/g, "-");
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
