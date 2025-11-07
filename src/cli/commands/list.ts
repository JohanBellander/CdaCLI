import { loadConstraints } from "../../core/constraintLoader.js";

export async function runListCommand(): Promise<void> {
  const constraints = await loadConstraints();
  if (constraints.length === 0) {
    console.log("No constraints found.");
    return;
  }

  const header = ["order", "constraint_id", "name"];
  const rows = constraints.map((constraint) => [
    String(constraint.meta.enforcementOrder),
    constraint.meta.id,
    constraint.meta.name,
  ]);

  const widths = header.map((column, index) =>
    Math.max(column.length, ...rows.map((row) => row[index].length)),
  );

  const lines: string[] = [];
  lines.push(formatRow(header, widths, true));
  lines.push(formatRow(widths.map((width) => "-".repeat(width)), widths));
  rows.forEach((row) => lines.push(formatRow(row, widths)));

  console.log(lines.join("\n"));
}

function formatRow(
  cells: string[],
  widths: number[],
  uppercase = false,
): string {
  const padded = cells.map((cell, index) => {
    const value = uppercase ? cell.toUpperCase() : cell;
    return value.padEnd(widths[index]);
  });
  return padded.join("  ");
}
