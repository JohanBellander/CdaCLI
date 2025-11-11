const COMMAND_SEQUENCE = [
  "Run `npm install` to fetch dependencies (repeat whenever package.json changes). If the command fails because `package.json` is missing, create the file and immediately rerun `npm install` before touching any source files. You may create only the minimal scaffolding required for TypeScript to compile (e.g., an empty `src/index.ts`) before the initial build—no production code yet.",
  "Run `npm run build` to ensure the workspace compiles before inspection. **Aside from minimal scaffolding needed for compilation, do not create or modify project files until this build succeeds.**",
  "Run `cda run --plan` and archive the resulting prompt + run_id. **Do not edit code until this completes. Paste the run_id/output into your transcript before proceeding. You may also save the prompt to a file if helpful.**",
  "Implement planned changes while consulting the prompt emitted by `cda run --plan`.",
  "Run `npm run build` again after editing files to confirm a clean TypeScript build. Paste the command outcome into your transcript.",
  "Run `cda run --exec` to execute the verification agent, then capture evidence (see below) and paste it into your transcript before summarizing.",
];

export function buildOnboardingGuide(): string {
  const lines: string[] = [];
  lines.push("# CDA Agent Onboarding Checklist");
  lines.push("");
  lines.push("> **STOP - Mandatory Command Sequence**");
  lines.push(">");
  lines.push("> Do not continue until each command succeeds in this exact order:");
  COMMAND_SEQUENCE.forEach((entry, index) =>
    lines.push(`> ${index + 1}. ${entry}`),
  );
  lines.push(">");
  lines.push("> After each command, paste the command + outcome into your transcript before moving on.");
  lines.push("");
  lines.push("## Evidence Checklist");
  lines.push("");
  lines.push("- After `cda run --plan`: save `cda-plan.txt`, record the printed `run_id`, and note all directives it lists.");
  lines.push("- After `cda run --exec`: capture the process exit status, the emitted `run_id`, and at least the opening lines of the agent's report.");
  lines.push("- If any command fails, stop immediately and report the failure instead of summarizing success.");
  lines.push("");
  lines.push("## Where To Find Architecture Guidance");
  lines.push("");
  lines.push("- `cda run --plan` is the sole source of the authoritative architectural instructions. Do not rely on memory or stale documents.");
  lines.push("- Use `cda describe <constraint-id>` for deep dives into specific rules when needed.");
  lines.push("");
  lines.push("## Validation Guardrails");
  lines.push("");
  lines.push("- You MUST NOT declare success until `cda run --exec` completes successfully and its evidence is recorded in the transcript.");
  lines.push("- If `cda run --exec` cannot reach an agent, treat the session as failed and document the blocker.");
  lines.push("- Always re-run `npm run build` after any code edits and before invoking `cda run --exec`.");
  lines.push("");
  lines.push("## Helpful Commands");
  lines.push("");
  lines.push("- `cda list` — review active constraints and their IDs.");
  lines.push("- `cda describe <constraint-id>` — inspect enforcement details for a specific constraint.");
  lines.push("- `cda run --plan --constraint <id>` — generate focused prompts when investigating a single constraint.");
  lines.push("- `cda run --exec --constraint <id>` — execute verification for one constraint when triaging.");
  lines.push("");
  lines.push("Maintain this checklist in your working directory and update your transcript with the captured evidence as you proceed.");
  lines.push("");

  return lines.join("\n");
}
