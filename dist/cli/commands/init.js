// Beads: CDATool-m8x CDATool-juc
import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadConstraints } from "../../core/constraintLoader.js";
import { buildCdaGuide } from "../../core/cdaGuideBuilder.js";
import { createError } from "../../core/errors.js";
const DEFAULT_AGENT_CONFIG = {
    default: "copilot",
    agents: {
        copilot: {
            command: "copilot",
            args: ["--model", "gpt-5", "--allow-all-tools"],
            mode: "arg",
            prompt_arg_flag: "-p",
            prompt_preamble: "You are a verification agent. Execute CDA architectural constraint detection steps strictly.",
            postscript: "Return ONLY the populated EXPECTED AGENT REPORT FORMAT. Do not paraphrase instructions.",
            max_length: 8000,
            agent_model: "gpt-5",
        },
        echo: {
            command: "echo",
            args: [],
            mode: "stdin",
            prompt_preamble: "Echo agent: mirrors the prompt for debugging purposes.",
            postscript: "Echo agent execution complete.",
        },
    },
};
export async function runInitCommand(args = [], options = {}) {
    const parsed = parseArgs(args);
    if (parsed.helpRequested) {
        printInitHelp();
        return;
    }
    const cwd = options.cwd ?? process.cwd();
    const configPath = path.join(cwd, "cda.config.json");
    const guidePath = path.join(cwd, "CDA.md");
    const agentsPath = path.join(cwd, "cda.agents.json");
    if (await fileExists(configPath)) {
        throw createError("CONFIG_ERROR", "cda.config.json already exists in this directory.");
    }
    const constraints = await loadConstraints();
    const configPayload = JSON.stringify({ version: 1, constraints: "builtin" }, null, 2);
    await mkdir(cwd, { recursive: true });
    await writeFile(configPath, `${configPayload}\n`, "utf8");
    const guideContent = buildCdaGuide(constraints);
    await writeFile(guidePath, guideContent, "utf8");
    if (parsed.skipAgents) {
        console.log("Created cda.config.json and CDA.md");
        console.log("Skipped cda.agents.json (--no-agents supplied).");
        return;
    }
    if (await fileExists(agentsPath)) {
        console.log("Created cda.config.json and CDA.md");
        console.log("cda.agents.json already exists; leaving it untouched.");
        return;
    }
    await writeFile(agentsPath, `${JSON.stringify(DEFAULT_AGENT_CONFIG, null, 2)}\n`, "utf8");
    console.log("Created cda.config.json, CDA.md, and cda.agents.json");
}
function parseArgs(args) {
    const parsed = {
        helpRequested: false,
        skipAgents: false,
    };
    for (let i = 0; i < args.length; i += 1) {
        const arg = args[i];
        if (arg === "--help" || arg === "-h") {
            parsed.helpRequested = true;
            return parsed;
        }
        if (arg === "--no-agents") {
            parsed.skipAgents = true;
            continue;
        }
        throw createError("CONFIG_ERROR", `Unknown option '${arg}' for cda init.`);
    }
    return parsed;
}
function printInitHelp() {
    console.log("Usage: cda init [--no-agents]");
    console.log("");
    console.log("Options:");
    console.log("  --no-agents   Skip creation of cda.agents.json scaffold.");
    console.log("  --help        Show this message.");
}
async function fileExists(filePath) {
    try {
        await access(filePath);
        return true;
    }
    catch {
        return false;
    }
}
