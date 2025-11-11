import { runValidateCommand } from "./validate.js";
import { runAgentCommand } from "./agent.js";
import { createError } from "../../core/errors.js";
export async function runRunCommand(args = [], options = {}) {
    const parsed = parseRunArgs(args);
    if (parsed.helpRequested) {
        printRunHelp();
        return;
    }
    switch (parsed.mode) {
        case "plan": {
            const agentArgs = buildAgentArgs(parsed, { includeExec: false });
            await runAgentCommand(agentArgs, options);
            return;
        }
        case "exec": {
            const agentArgs = buildAgentArgs(parsed, { includeExec: true });
            await runAgentCommand(agentArgs, options);
            return;
        }
        case "audit": {
            throw createError("CONFIG_ERROR", "--audit is not yet supported. Follow the release notes for availability.");
        }
        case "validate":
        default: {
            const validateArgs = buildValidateArgs(parsed);
            await runValidateCommand(validateArgs, options);
        }
    }
}
function buildValidateArgs(parsed) {
    const args = [];
    if (parsed.constraintId) {
        args.push("--constraint", parsed.constraintId);
    }
    if (parsed.sequential) {
        args.push("--sequential");
    }
    if (parsed.legacyFormat) {
        args.push("--legacy-format");
    }
    return args;
}
function buildAgentArgs(parsed, options) {
    const args = [];
    if (parsed.constraintId) {
        args.push("--constraint", parsed.constraintId);
    }
    if (parsed.sequential) {
        args.push("--sequential");
    }
    if (parsed.agentName) {
        args.push("--agent", parsed.agentName);
    }
    if (parsed.outputPath) {
        args.push("--output", parsed.outputPath);
    }
    if (parsed.legacyFormat) {
        args.push("--legacy-format");
    }
    if (!options.includeExec) {
        args.push("--dry-run");
    }
    return args;
}
function parseRunArgs(argv) {
    const parsed = {
        mode: "validate",
        sequential: false,
        legacyFormat: false,
        helpRequested: false,
    };
    let planRequested = false;
    let execRequested = false;
    let auditRequested = false;
    for (let i = 0; i < argv.length; i += 1) {
        const arg = argv[i];
        switch (arg) {
            case "--help":
            case "-h": {
                parsed.helpRequested = true;
                return parsed;
            }
            case "--plan": {
                planRequested = true;
                break;
            }
            case "--exec": {
                execRequested = true;
                break;
            }
            case "--audit": {
                auditRequested = true;
                break;
            }
            case "--constraint":
            case "-c": {
                const next = argv[i + 1];
                if (!next) {
                    throw createError("CONFIG_ERROR", "Expected constraint id after --constraint.");
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
                const next = argv[i + 1];
                if (!next) {
                    throw createError("CONFIG_ERROR", "Expected agent name after --agent.");
                }
                parsed.agentName = next;
                i += 1;
                break;
            }
            case "--audit-agent": {
                const next = argv[i + 1];
                if (!next) {
                    throw createError("CONFIG_ERROR", "Expected agent name after --audit-agent.");
                }
                parsed.auditAgentName = next;
                i += 1;
                break;
            }
            case "--output": {
                const next = argv[i + 1];
                if (!next) {
                    throw createError("CONFIG_ERROR", "Expected path after --output.");
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
    const requestedModes = Number(planRequested) + Number(execRequested) + Number(auditRequested);
    if (requestedModes > 1) {
        throw createError("CONFIG_ERROR", "Use only one of --plan, --exec, or --audit at a time.");
    }
    if (planRequested) {
        parsed.mode = "plan";
    }
    else if (execRequested) {
        parsed.mode = "exec";
    }
    else if (auditRequested) {
        parsed.mode = "audit";
    }
    if (parsed.constraintId && parsed.sequential) {
        throw createError("CONFIG_ERROR", "Use either --constraint or --sequential, not both.");
    }
    if (parsed.outputPath && parsed.mode === "validate") {
        throw createError("CONFIG_ERROR", "--output can only be used with --plan or --exec.");
    }
    if (parsed.agentName && parsed.mode === "validate") {
        throw createError("CONFIG_ERROR", "--agent can only be used with --plan, --exec, or --audit.");
    }
    if (parsed.auditAgentName && parsed.mode !== "audit") {
        throw createError("CONFIG_ERROR", "--audit-agent requires --audit.");
    }
    return parsed;
}
function printRunHelp() {
    console.log("Usage: cda run [--plan|--exec|--audit] [options]");
    console.log("");
    console.log("Modes (pick one):");
    console.log("  (default)        Validate constraints locally (same as legacy `cda validate`).");
    console.log("  --plan           Assemble instruction package without invoking agents.");
    console.log("  --exec           Assemble instructions and invoke configured agent.");
    console.log("  --audit          Reserved for auditor agents (coming soon).");
    console.log("");
    console.log("Options:");
    console.log("  --constraint, -c <id>   Target a single constraint.");
    console.log("  --sequential            Shortcut for the first recommended constraint.");
    console.log("  --agent <name>          Select agent profile (plan/exec/audit only).");
    console.log("  --output <path>         Write prompt to file (plan/exec).");
    console.log("  --legacy-format         Emit legacy instruction layout.");
    console.log("  --help                  Show this message.");
}
