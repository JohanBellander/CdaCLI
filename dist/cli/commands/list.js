import { loadConstraints } from "../../core/constraintLoader.js";
import { loadProjectConfig } from "../../core/projectConfig.js";
export async function runListCommand(options = {}) {
    const cwd = options.cwd ?? process.cwd();
    const projectConfig = await loadProjectConfig({ cwd, required: false });
    const constraints = await loadConstraints({
        constraintsDir: options.constraintsDir,
        constraintOverrides: projectConfig?.constraintOverrides,
    });
    if (constraints.length === 0) {
        console.log("No constraints found.");
        return;
    }
    const header = ["order", "constraint_id", "name", "group", "status"];
    const rows = constraints.map((constraint) => [
        String(constraint.meta.enforcementOrder),
        constraint.meta.id,
        constraint.meta.name,
        constraint.meta.group,
        formatStatus(constraint.meta),
    ]);
    const widths = header.map((column, index) => Math.max(column.length, ...rows.map((row) => row[index].length)));
    const lines = [];
    lines.push(formatRow(header, widths, true));
    lines.push(formatRow(widths.map((width) => "-".repeat(width)), widths));
    rows.forEach((row) => lines.push(formatRow(row, widths)));
    console.log(lines.join("\n"));
}
function formatRow(cells, widths, uppercase = false) {
    const padded = cells.map((cell, index) => {
        const value = uppercase ? cell.toUpperCase() : cell;
        return value.padEnd(widths[index]);
    });
    return padded.join("  ");
}
function formatStatus(meta) {
    return meta.isActive ? "active" : "disabled";
}
