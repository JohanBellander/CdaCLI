interface PhaseSequence {
  title: string;
  steps: string[];
}

const PHASE_SEQUENCE: PhaseSequence[] = [
  {
    title: "Phase 1: Foundation (Config, Logging, Structure)",
    steps: [
      "Run `npm install` to fetch dependencies. If `package.json` is missing, create it first.",
      "Run `npm run build` to ensure TypeScript compiles. Create minimal scaffolding if needed (empty `src/index.ts`).",
      "Run `cda agent --phase foundation --dry-run` and archive the prompt + run_id.",
      "Implement Phase 1 changes (config entrypoint, logger, folder structure).",
      "Run `npm run build` to verify compilation.",
      "Run `cda run --phase foundation --exec` to validate. **Do not proceed to Phase 2 until this passes.**",
    ],
  },
  {
    title: "Phase 2: Domain Layer (Pure Business Logic)",
    steps: [
      "Run `cda agent --phase domain --dry-run` and archive the prompt + run_id.",
      "Implement Phase 2 changes (domain entities, Zod schemas, pure functions).",
      "Run `npm run build` to verify compilation.",
      "Run `cda run --phase domain --exec` to validate. **Do not proceed to Phase 3 until this passes.**",
    ],
  },
  {
    title: "Phase 3: Infrastructure Layer (Adapters, Ports)",
    steps: [
      "Run `cda agent --phase infrastructure --dry-run` and archive the prompt + run_id.",
      "Implement Phase 3 changes (database adapters, HTTP clients, repository implementations).",
      "Run `npm run build` to verify compilation.",
      "Run `cda run --phase infrastructure --exec` to validate. **Do not proceed to Phase 4 until this passes.**",
    ],
  },
  {
    title: "Phase 4: Application Layer (Use Cases, Orchestration)",
    steps: [
      "Run `cda agent --phase application --dry-run` and archive the prompt + run_id.",
      "Implement Phase 4 changes (use cases, test coverage).",
      "Run `npm run build` to verify compilation.",
      "Run `cda run --phase application --exec` to validate. **Do not proceed to Phase 5 until this passes.**",
    ],
  },
  {
    title: "Phase 5: Presentation Layer (HTTP, React, Next.js)",
    steps: [
      "Run `cda agent --phase presentation --dry-run` and archive the prompt + run_id.",
      "Implement Phase 5 changes (Fastify routes, Next.js pages, React components).",
      "Run `npm run build` to verify compilation.",
      "Run `cda run --phase presentation --exec` to validate. **All constraints must pass.**",
    ],
  },
];

export function buildOnboardingGuide(): string {
  const lines: string[] = [];
  lines.push("# CDA Agent Onboarding Checklist");
  lines.push("");
  lines.push("## STOP - Mandatory Phase-Gated Command Sequence");
  lines.push("");
  lines.push(
    "Do not continue until each command succeeds in this exact order. After every command, paste the command plus its outcome into your transcript before moving on.",
  );
  lines.push("");
  let stepNumber = 1;
  for (const phase of PHASE_SEQUENCE) {
    lines.push(`### ${phase.title}`);
    phase.steps.forEach((entry) => {
      lines.push(`${stepNumber}. ${entry}`);
      stepNumber += 1;
    });
    lines.push("");
  }
  lines.push(
    "**Reminder**: Each `--phase` run revalidates every prior phase cumulatively. Do not skip ahead until the current phase passes `cda run --phase <name> --exec`.",
  );
  lines.push("");
  lines.push("## Full-Fidelity Phase Behavior");
  lines.push("");
  lines.push(
    "- Constraints are contracts. If `cda run --phase <name> --exec` reports violations, that phase is blocked until the issues are fixed.",
  );
  lines.push(
    "- Phase 4 (application) and Phase 5 (presentation) are hard-gated just like Phases 1-3. Do not advance because of time, token, or complexity pressure.",
  );
  lines.push(
    "- Loop tightly: implement/refine, run `npm run build`, run the relevant tests (`npm test` for application, `npm start`/UI smoke checks for presentation), then rerun `cda run --phase <name> --exec` until it returns zero violations.",
  );
  lines.push(
    "- If you cannot achieve a clean run, stop and report which constraints remain failing instead of claiming the next phase.",
  );
  lines.push("- See `SPEC_FF.md` for the full Phase 4-5 requirements and reference examples.");
  lines.push("");
  lines.push("## Evidence Checklist");
  lines.push("");
  lines.push(
    "- After each `cda agent --phase <name> --dry-run`: record the `run_id`, link to the archived prompt, and capture the phase objective summary in your transcript.",
  );
  lines.push(
    "- After each `cda run --phase <name> --exec`: capture the process exit status, the emitted `run_id`, and at least the opening lines of the agent's report.",
  );
  lines.push("- If any command fails, stop immediately and report the failure instead of summarizing success.");
  lines.push("");
  lines.push("## Phase Implementation Order Rationale");
  lines.push("");
  lines.push("**Why 5 phases?**");
  lines.push("- Each phase builds on the previous layers (foundation → domain → infrastructure → application → presentation).");
  lines.push("- Smaller prompts (5-8KB per phase) prevent context overload compared to the 43KB monolithic prompt.");
  lines.push("- Layered checkpoints catch architectural drift early instead of at the end of the project.");
  lines.push("");
  lines.push("**What if a previous-phase constraint regresses?**");
  lines.push(
    "- Re-run `cda run --phase <current-phase> --exec` and fix the regression immediately. Phase prompts are cumulative checkpoints, not isolated sandboxes.",
  );
  lines.push("");
  lines.push("**Can I skip phases?**");
  lines.push(
    "- No. Each phase assumes the earlier layers are complete and validated. Skipping phases results in incoherent architecture and failing prompts.",
  );
  lines.push("");
  lines.push("**When is the legacy all-at-once workflow appropriate?**");
  lines.push(
    "- Maintenance or refactor sessions on mature codebases, single-constraint investigations, or auditor reviews. New codebases must follow the phased path.",
  );
  lines.push("");
  lines.push("## Where To Find Architecture Guidance");
  lines.push("");
  lines.push("- Phase prompts emitted by `cda agent --phase <name> --dry-run` are the authoritative source of architectural instructions. Do not rely on memory or stale documents.");
  lines.push("- Use `cda describe <constraint-id>` for deep dives into specific rules when needed.");
  lines.push("");
  lines.push("## Validation Guardrails");
  lines.push("");
  lines.push(
    "- You MUST NOT declare success until `cda run --phase <name> --exec` completes successfully for the current phase and the evidence is recorded in your transcript.",
  );
  lines.push("- If the agent cannot be reached, stop and document the blocker instead of assuming success.");
  lines.push("- Always re-run `npm run build` after any code edits and before invoking `cda run --phase <name> --exec`. Failed builds invalidate the phase checkpoint.");
  lines.push("");
  lines.push("## Continuous Validation During Development");
  lines.push("");
  lines.push("**IMPORTANT**: The validation cycle (build → verify) must repeat automatically after every substantial change:");
  lines.push("");
  lines.push("- After implementing a new feature → run `npm run build` + `cda run --phase <current-phase> --exec`.");
  lines.push("- After fixing violations → run `npm run build` + `cda run --phase <current-phase> --exec`.");
  lines.push("- After refactoring code → run `npm run build` + `cda run --phase <current-phase> --exec`.");
  lines.push("- After adding new files/modules → run `npm run build` + `cda run --phase <current-phase> --exec`.");
  lines.push("");
  lines.push(
    "Do NOT wait for the user to prompt validation. Treat `cda run --phase <name> --exec` as your automated test suite—run it proactively to catch architectural drift early.",
  );
  lines.push("");
  lines.push("## Helpful Commands");
  lines.push("");
  lines.push("- `cda list` — review active constraints and their IDs.");
  lines.push("- `cda describe <constraint-id>` — inspect enforcement details for a specific constraint.");
  lines.push("- `cda config` — interactively toggle constraints (requires a TTY).");
  lines.push("- `cda agent --phase <name> --dry-run` — generate focused prompts for the current implementation phase.");
  lines.push("- `cda run --phase <name> --exec` — validate cumulative constraints up to the given phase.");
  lines.push("- `cda run --exec --constraint <id>` — execute verification for one constraint when triaging a regression.");
  lines.push("");
  lines.push("Maintain this checklist in your working directory and update your transcript with the captured evidence as you proceed.");
  lines.push("");

  return lines.join("\n");
}
