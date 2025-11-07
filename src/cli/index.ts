#!/usr/bin/env node

import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { runInitCommand } from "./commands/init.js";
import { runValidateCommand } from "./commands/validate.js";
import { runListCommand } from "./commands/list.js";
import { runDescribeCommand } from "./commands/describe.js";
import { createError, getExitCode, isCdaError } from "../core/errors.js";

const require = createRequire(import.meta.url);
const { version } = require("../../package.json") as { version: string };

type CommandHandler = (args: string[]) => Promise<void>;

const COMMANDS: Record<string, CommandHandler> = {
  init: async () => runInitCommand(),
  list: async () => runListCommand(),
  describe: async (args) => runDescribeCommand(args),
  validate: async (args) => runValidateCommand(args),
};

export async function run(argv: string[] = process.argv.slice(2)): Promise<void> {
  const [commandName, ...commandArgs] = argv;

  if (!commandName || commandName === "-h" || commandName === "--help") {
    printHelp();
    return;
  }

  if (commandName === "-v" || commandName === "--version") {
    console.log(`CDA CLI v${version}`);
    return;
  }

  const handler = COMMANDS[commandName];
  if (!handler) {
    handleCliError(createError("FATAL", `Unknown command '${commandName}'.`));
    return;
  }

  try {
    await handler(commandArgs);
  } catch (error) {
    handleCliError(error);
  }
}

function printHelp(): void {
  console.log(`CDA CLI v${version}`);
  console.log("");
  console.log("Usage:");
  console.log("  cda <command> [options]");
  console.log("");
  console.log("Available commands:");
  console.log("  init       Initialize CDA config and generate CDA.md");
  console.log("  list       List bundled constraints");
  console.log("  describe   Show full enforcement protocol for a constraint");
  console.log("  validate   Emit instruction packages");
  console.log("");
  console.log("Use `cda <command> --help` for command-specific options.");
}

function handleCliError(error: unknown): void {
  if (isCdaError(error)) {
    console.error(`${error.code}: ${error.message}`);
    process.exitCode = error.exitCode;
    return;
  }

  console.error("FATAL:", error);
  process.exitCode = getExitCode(error);
}

// Always invoke run() when this module is executed via the bin shim or directly.
// The previous conditional prevented execution when loaded through the npm-generated wrapper
// script (argv[1] pointed at the shim, not this file), resulting in no output.
// Calling unconditionally is safe because it only performs CLI dispatch once.
run();
