import { loadConstraints } from "../../core/constraintLoader.js";
import { buildBatchInstructionPackage, buildSingleInstructionPackage, } from "../../core/instructionEmitter.js";
import { generateRunId } from "../../core/runId.js";
import { createError } from "../../core/errors.js";
import { formatBatchInstructionPackage, formatLegacyBatchInstructionPackage, formatLegacySingleInstructionPackage, formatSingleInstructionPackage, } from "../formatters.js";
export async function runValidateCommand(args = []) {
    if (args.includes("-h") || args.includes("--help")) {
        printValidateHelp();
        return;
    }
    const options = parseValidateArgs(args);
    const constraints = await loadConstraints();
    if (constraints.length === 0) {
        throw createError("BUNDLE_ERROR", "No constraints available to validate.");
    }
    const runId = generateRunId();
    if (options.constraintId || options.sequential) {
        const targetId = options.constraintId ?? constraints[0].meta.id;
        const constraint = constraints.find((doc) => doc.meta.id === targetId);
        if (!constraint) {
            throw createError("CONFIG_ERROR", `Unknown constraint '${targetId}'.`);
        }
        const pkg = buildSingleInstructionPackage({ runId, constraint });
        const rendered = options.legacyFormat
            ? formatLegacySingleInstructionPackage(pkg)
            : formatSingleInstructionPackage(pkg);
        console.log(rendered);
        return;
    }
    const pkg = buildBatchInstructionPackage({ runId, constraints });
    const rendered = options.legacyFormat
        ? formatLegacyBatchInstructionPackage(pkg)
        : formatBatchInstructionPackage(pkg);
    console.log(rendered);
}
function parseValidateArgs(args) {
    const result = {
        sequential: false,
        legacyFormat: false,
    };
    for (let i = 0; i < args.length; i += 1) {
        const arg = args[i];
        if (arg === "--constraint" || arg === "-c") {
            const next = args[i + 1];
            if (!next) {
                throw createError("CONFIG_ERROR", "Expected constraint id after --constraint.");
            }
            result.constraintId = next;
            i += 1;
            continue;
        }
        if (arg === "--sequential") {
            result.sequential = true;
            continue;
        }
        if (arg === "--legacy-format") {
            result.legacyFormat = true;
            continue;
        }
        throw createError("CONFIG_ERROR", `Unknown option '${arg}'.`);
    }
    if (result.constraintId && result.sequential) {
        throw createError("CONFIG_ERROR", "Use either --constraint or --sequential, not both.");
    }
    return result;
}
function printValidateHelp() {
    console.log("Usage: cda validate [--constraint <id>] [--sequential]");
    console.log("");
    console.log("Options:");
    console.log("  --constraint, -c <id>   Emit instructions for a single constraint.");
    console.log("  --sequential            Alias for the first constraint in recommended order.");
    console.log("  --legacy-format         Emit the deprecated pre-update output (instruction-only banner omitted).");
}
