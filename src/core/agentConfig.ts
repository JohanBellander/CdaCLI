// Beads: CDATool-nxa CDATool-619 CDATool-7pl CDATool-87t

import { readFile } from "node:fs/promises";
import path from "node:path";

import { createError } from "./errors.js";

export const AGENT_CONFIG_FILENAME = "cda.agents.json";

export type AgentExecutionMode = "stdin";

export interface AgentDefinition {
  name: string;
  command: string;
  args: string[];
  mode: AgentExecutionMode;
  promptPreamble?: string;
  postscript?: string;
  maxLength?: number;
  agentModel?: string;
}

export interface AgentConfig {
  path: string;
  defaultAgent?: string;
  agents: Record<string, AgentDefinition>;
}

interface LoadAgentConfigOptions {
  cwd?: string;
  required?: boolean;
}

export async function loadAgentConfig(
  options: LoadAgentConfigOptions = {},
): Promise<AgentConfig | null> {
  const cwd = options.cwd ?? process.cwd();
  const required = options.required ?? true;
  const configPath = path.join(cwd, AGENT_CONFIG_FILENAME);

  let fileContents: string;
  try {
    fileContents = await readFile(configPath, "utf8");
  } catch (error) {
    const nodeErr = error as NodeJS.ErrnoException;
    if (nodeErr.code === "ENOENT") {
      if (required) {
        throw createError(
          "CONFIG_ERROR",
          `Agent config not found at ${configPath}.`,
        );
      }
      return null;
    }
    throw createError(
      "CONFIG_ERROR",
      `Unable to read ${configPath}: ${nodeErr.message}`,
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(fileContents);
  } catch (error) {
    throw createError(
      "CONFIG_ERROR",
      `Invalid JSON in ${configPath}: ${(error as Error).message}`,
    );
  }

  const normalized = normalizeAgentConfig(parsed, configPath);
  return {
    path: configPath,
    defaultAgent: normalized.defaultAgent,
    agents: normalized.agents,
  };
}

export function resolveAgent(
  config: AgentConfig,
  requestedAgent?: string,
): { agentName: string; definition: AgentDefinition } {
  if (requestedAgent) {
    const agent = config.agents[requestedAgent];
    if (!agent) {
      throw createError("CONFIG_ERROR", `Unknown agent '${requestedAgent}'.`);
    }
    return { agentName: requestedAgent, definition: agent };
  }

  if (config.defaultAgent) {
    const defaultAgent = config.agents[config.defaultAgent];
    if (!defaultAgent) {
      throw createError(
        "CONFIG_ERROR",
        `Default agent '${config.defaultAgent}' is not defined in cda.agents.json.`,
      );
    }
    return { agentName: config.defaultAgent, definition: defaultAgent };
  }

  if (config.agents.copilot) {
    return { agentName: "copilot", definition: config.agents.copilot };
  }

  throw createError(
    "CONFIG_ERROR",
    "No default agent configured and 'copilot' agent not available. Specify --agent <name>.",
  );
}

function normalizeAgentConfig(
  value: unknown,
  configPath: string,
): { defaultAgent?: string; agents: Record<string, AgentDefinition> } {
  if (!isRecord(value)) {
    throw createError(
      "CONFIG_ERROR",
      `${configPath} must contain a JSON object.`,
    );
  }

  const agentsRaw = value.agents;
  if (!isRecord(agentsRaw)) {
    throw createError(
      "CONFIG_ERROR",
      `${configPath} must include an 'agents' object.`,
    );
  }

  const agentEntries = Object.entries(agentsRaw);
  if (agentEntries.length === 0) {
    throw createError(
      "CONFIG_ERROR",
      `${configPath} must define at least one agent.`,
    );
  }

  const agents: Record<string, AgentDefinition> = {};
  for (const [agentName, rawDefinition] of agentEntries) {
    agents[agentName] = normalizeAgentDefinition(
      agentName,
      rawDefinition,
      configPath,
    );
  }

  const defaultRaw = value.default;
  let defaultAgent: string | undefined;
  if (defaultRaw !== undefined) {
    if (typeof defaultRaw !== "string" || defaultRaw.length === 0) {
      throw createError(
        "CONFIG_ERROR",
        `${configPath} default must be a non-empty string.`,
      );
    }
    if (!agents[defaultRaw]) {
      throw createError(
        "CONFIG_ERROR",
        `${configPath} default references unknown agent '${defaultRaw}'.`,
      );
    }
    defaultAgent = defaultRaw;
  }

  return { defaultAgent, agents };
}

function normalizeAgentDefinition(
  name: string,
  value: unknown,
  configPath: string,
): AgentDefinition {
  if (!isRecord(value)) {
    throw createError(
      "CONFIG_ERROR",
      `Agent '${name}' in ${configPath} must be an object.`,
    );
  }

  const command = asNonEmptyString(
    value.command,
    `agents.${name}.command`,
    configPath,
  );
  const args = parseArgs(value.args, name, configPath);
  const mode = parseMode(value.mode, name, configPath);
  const promptPreamble = asOptionalString(
    value.prompt_preamble,
    `agents.${name}.prompt_preamble`,
    configPath,
  );
  const postscript = asOptionalString(
    value.postscript,
    `agents.${name}.postscript`,
    configPath,
  );
  const maxLength = asOptionalPositiveInteger(
    value.max_length,
    `agents.${name}.max_length`,
    configPath,
  );
  const agentModel = asOptionalString(
    value.agent_model,
    `agents.${name}.agent_model`,
    configPath,
  );

  return {
    name,
    command,
    args,
    mode,
    promptPreamble: promptPreamble ?? undefined,
    postscript: postscript ?? undefined,
    maxLength: maxLength ?? undefined,
    agentModel: agentModel ?? undefined,
  };
}

function parseArgs(
  value: unknown,
  agentName: string,
  configPath: string,
): string[] {
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value)) {
    throw createError(
      "CONFIG_ERROR",
      `agents.${agentName}.args in ${configPath} must be an array of strings.`,
    );
  }
  const parsed: string[] = [];
  for (const [index, arg] of value.entries()) {
    if (typeof arg !== "string") {
      throw createError(
        "CONFIG_ERROR",
        `agents.${agentName}.args[${index}] in ${configPath} must be a string.`,
      );
    }
    parsed.push(arg);
  }
  return parsed;
}

function parseMode(
  value: unknown,
  agentName: string,
  configPath: string,
): AgentExecutionMode {
  if (typeof value !== "string" || value.length === 0) {
    throw createError(
      "CONFIG_ERROR",
      `agents.${agentName}.mode in ${configPath} must be 'stdin'.`,
    );
  }
  if (value !== "stdin") {
    throw createError(
      "CONFIG_ERROR",
      `Unsupported agent mode '${value}' for agent '${agentName}'. MVP only supports 'stdin'.`,
    );
  }
  return "stdin";
}

function asNonEmptyString(
  value: unknown,
  context: string,
  configPath: string,
): string {
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }
  throw createError(
    "CONFIG_ERROR",
    `${context} in ${configPath} must be a non-empty string.`,
  );
}

function asOptionalString(
  value: unknown,
  context: string,
  configPath: string,
): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value === "string") {
    return value;
  }
  throw createError(
    "CONFIG_ERROR",
    `${context} in ${configPath} must be a string if provided.`,
  );
}

function asOptionalPositiveInteger(
  value: unknown,
  context: string,
  configPath: string,
): number | null {
  if (value === undefined || value === null) {
    return null;
  }
  if (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value > 0 &&
    Number.isInteger(value)
  ) {
    return value;
  }
  throw createError(
    "CONFIG_ERROR",
    `${context} in ${configPath} must be a positive integer if provided.`,
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
