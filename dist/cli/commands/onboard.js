// Beads: CDATool-m8x
import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildOnboardingGuide } from "../../core/cdaOnboardingGuide.js";
import { createError } from "../../core/errors.js";
import { DEFAULT_AGENT_CONFIG, buildDefaultConfigPayload, } from "./init.js";
import { loadConstraints } from "../../core/constraintLoader.js";
export async function runOnboardCommand(args = [], options = {}) {
    const parsed = parseArgs(args);
    if (parsed.helpRequested) {
        printOnboardHelp();
        return;
    }
    const cwd = options.cwd ?? process.cwd();
    const targetPath = path.resolve(cwd, parsed.outputPath ?? "CDA.md");
    if (!parsed.overwrite && (await fileExists(targetPath))) {
        throw createError("CONFIG_ERROR", `${path.basename(targetPath)} already exists. Remove it or re-run with --overwrite.`);
    }
    await mkdir(path.dirname(targetPath), { recursive: true });
    const guide = buildOnboardingGuide();
    await writeFile(targetPath, `${guide}\n`, "utf8");
    const createdArtifacts = [];
    createdArtifacts.push(`${path.relative(cwd, targetPath) || "CDA.md"}`);
    const configPath = path.join(cwd, "cda.config.json");
    if (!(await fileExists(configPath))) {
        const constraints = await loadConstraints();
        const configPayload = buildDefaultConfigPayload(constraints.map((doc) => doc.meta.id));
        await writeFile(configPath, `${configPayload}\n`, "utf8");
        createdArtifacts.push("cda.config.json");
    }
    const agentsPath = path.join(cwd, "cda.agents.json");
    if (!(await fileExists(agentsPath))) {
        await writeFile(agentsPath, `${JSON.stringify(DEFAULT_AGENT_CONFIG, null, 2)}\n`, "utf8");
        createdArtifacts.push("cda.agents.json");
    }
    console.log(`Created ${createdArtifacts.join(", ")}.`);
}
function parseArgs(args) {
    const parsed = {
        helpRequested: false,
        overwrite: false,
    };
    for (let i = 0; i < args.length; i += 1) {
        const arg = args[i];
        if (arg === "--help" || arg === "-h") {
            parsed.helpRequested = true;
            return parsed;
        }
        if (arg === "--overwrite") {
            parsed.overwrite = true;
            continue;
        }
        if (arg === "--output") {
            const next = args[i + 1];
            if (!next) {
                throw createError("CONFIG_ERROR", "Missing value for --output option in cda onboard.");
            }
            parsed.outputPath = next;
            i += 1;
            continue;
        }
        throw createError("CONFIG_ERROR", `Unknown option '${arg}' for cda onboard.`);
    }
    return parsed;
}
function printOnboardHelp() {
    console.log("Usage: cda onboard [--overwrite] [--output <path>]");
    console.log("");
    console.log("Options:");
    console.log("  --overwrite   Overwrite the output file if it already exists.");
    console.log("  --output      Write the guide to a custom path instead of CDA.md.");
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
