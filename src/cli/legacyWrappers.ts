import { runRunCommand } from "./commands/run.js";

const VALIDATE_WARNING =
  "DEPRECATED: `cda validate` will be removed in v0.6.0. Use `cda run` with the same flags.";
const AGENT_EXEC_WARNING =
  "DEPRECATED: `cda agent` will be removed in v0.6.0. Use `cda run --exec` instead.";
const AGENT_PLAN_WARNING =
  "DEPRECATED: `cda agent --dry-run/--no-exec` will be removed in v0.6.0. Use `cda run --plan` instead.";

export async function runLegacyValidateCommand(args: string[]): Promise<void> {
  console.warn(VALIDATE_WARNING);
  await runRunCommand(args);
}

export async function runLegacyAgentCommand(args: string[]): Promise<void> {
  const { passthroughArgs, planRequested } = translateAgentArgs(args);
  console.warn(planRequested ? AGENT_PLAN_WARNING : AGENT_EXEC_WARNING);
  const modeFlag = planRequested ? "--plan" : "--exec";
  await runRunCommand([modeFlag, ...passthroughArgs]);
}

function translateAgentArgs(args: string[]): {
  passthroughArgs: string[];
  planRequested: boolean;
} {
  const passthroughArgs: string[] = [];
  let planRequested = false;
  for (const arg of args) {
    if (arg === "--dry-run" || arg === "--no-exec") {
      planRequested = true;
      continue;
    }
    passthroughArgs.push(arg);
  }
  return { passthroughArgs, planRequested };
}
