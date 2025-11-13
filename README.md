# Constraint-Driven Architecture CLI (CDA)
## Unified `cda run` Workflow (0.5.0+)

The `cda run` command is the single entry point for validation, prompt planning, and execution. It replaces the separate `cda validate` and `cda agent` flows while preserving all existing flags (`--constraint`, `--sequential`, `--agent`, `--legacy-format`, etc.).

### Usage

```
cda run [--plan|--exec|--audit] [--constraint <id> | --sequential]
        [--agent <name>] [--output <file>] [--legacy-format]
```

Modes:
- *(default)* – Emit the standard instruction package (legacy `cda validate`).
- `--plan` – Assemble the full agent prompt without spawning external tooling (legacy `cda agent --dry-run` / `--no-exec`).
- `--exec` – Assemble the prompt and invoke the configured external CLI (legacy `cda agent`).
- `--audit` – Reserved for future auditor profiles (flag accepted, not yet implemented).

Key flags:
- `--constraint <id>` / `--sequential` – Single-constraint modes. Works across all modes.
- `--agent <name>` – Override the default `cda.agents.json` entry for `--plan`/`--exec`.
- `--output <file>` – Persist the assembled prompt before printing/executing.
- `--legacy-format` – Emit the pre-Spec-Update-1 layout (no banner/directive/metrics).

Legacy wrappers (`cda validate` and `cda agent`) now forward arguments to `cda run` and emit deprecation warnings. They will be removed in **v0.6.0**.

| Legacy command                         | Replacement                    | Removal |
|----------------------------------------|--------------------------------|---------|
| `cda validate [flags]`                 | `cda run [flags]`              | 0.6.0   |
| `cda agent [flags]`                    | `cda run --exec [flags]`       | 0.6.0   |
| `cda agent --dry-run/--no-exec [flags]`| `cda run --plan [flags]`       | 0.6.0   |

### Prompt Structure
`cda run --plan` and `cda run --exec` both emit the same agent prompt:
1. Banner: `AGENT VERIFICATION MODE: PROMPT INTENDED FOR AUTOMATED EXECUTION`.
2. Metadata block: `run_id`, ISO timestamp, `instruction_format_version`, `agent_name`, optional `agent_model`, `token_estimate_method`.
3. Optional `prompt_preamble` from `cda.agents.json`.
4. Raw instruction package emitted by `cda run` (batch or single constraint) with AGENT ACTION REQUIRED / DO NOT blocks and the expanded report skeleton.
5. Directive block reminding the agent to execute detection/remediation steps verbatim.
6. Optional `postscript`.
7. Metrics: `original_char_count` and `approx_token_length` (chars ÷ 4 heuristic). CDA enforces any `max_length` in the agent definition.

### Sample `cda.agents.json`
`cda init` scaffolds a default config unless `--no-agents` is supplied:

```json
{
  "default": "copilot-stdin",
  "agents": {
    "copilot": {
      "command": "copilot",
      "args": ["--model", "gpt-5", "--allow-all-tools", "--allow-all-paths"],
      "mode": "arg",
      "prompt_arg_flag": "-p",
      "prompt_file_arg": "--prompt-file",
      "prompt_preamble": "You are a verification agent. Execute CDA architectural constraint detection steps strictly.",
      "postscript": "Return ONLY the populated agent report format. Do not paraphrase instructions.",
      "max_length": 40000,
      "agent_model": "gpt-5"
    },
    "copilot-stdin": {
      "command": "copilot",
      "args": ["--model", "gpt-5", "--allow-all-tools", "--allow-all-paths"],
      "mode": "stdin",
      "prompt_preamble": "You are a verification agent. Execute CDA architectural constraint detection steps strictly.",
      "postscript": "Return ONLY the populated agent report format. Do not paraphrase instructions.",
      "agent_model": "gpt-5"
    },
    "echo": {
      "command": "echo",
      "args": [],
      "mode": "stdin",
      "prompt_preamble": "Echo agent: mirrors the prompt for debugging purposes.",
      "postscript": "Echo agent execution complete."
    }
  }
}
```

`copilot-stdin` streams prompts via stdin and is the default; `copilot` retains inline-argument mode; `echo` is a safe diagnostic target for `cda run --plan`/`--exec`.

### Notes
- If `cda.agents.json` is missing, `cda run --plan` still emits prompts. `cda run --exec` warns that execution is disabled until an agent definition exists.
- Execution supports `stdin` and inline-argument (`mode: "arg"`) agents. CDA automatically flips to `--prompt-file` when inline prompts exceed Windows limits.
- **Windows Command Line Limits**: Inline `arg` mode fails near 8K characters. CDA warns once the prompt eclipses ~7000 characters and suggests switching to stdin mode (`copilot-stdin`) or narrowing the constraint scope.
- CDA streams stdout/stderr from the external agent but never interprets the response. Exit codes reflect CDA errors only.
- Use `--legacy-format` when downstream tooling cannot ingest the enriched prompt layout; document the exception in your agent report.

### External Agent Prerequisites
1. **Install the standalone `copilot` binary** via the [Copilot CLI docs](https://docs.github.com/en/copilot/github-copilot-chat/copilot-cli) or a package manager:
   - macOS/Linux (Homebrew): `brew install github-copilot-cli`
   - Windows (winget): `winget install GitHub.CopilotCLI`
   - Universal fallback: `npm install -g @githubnext/github-copilot-cli`
2. **Verify the executable is on `PATH`:**
   - Windows: `where copilot`
   - macOS/Linux: `which copilot`
   If discovery fails, point `agents.<name>.command` to an absolute path such as `C:\Users\me\AppData\Local\Programs\copilot\copilot.exe`.
3. **Fallback strategies when execution fails:**
   - Switch to the bundled `echo` agent (`--agent echo`) so `cda run --plan`/`--exec` can surface prompts without touching Copilot (see bead CDATool-z76).
   - If the installed Copilot version lacks `--prompt-file`, set the agent `mode` to `"stdin"` so CDA streams prompts via stdin.
   - For inline prompts that exceed command-line limits, run `cda run --plan --agent copilot-stdin` or temporarily reduce the constraint scope until Copilot supports file-based prompts (design context: bead CDATool-2wc).
4. **Re-run `copilot auth login`** whenever GitHub tokens expire. CDA surfaces spawn errors but does not manage authentication.
5. **CDA automatically retries `copilot.cmd` on Windows** when the shimmed `copilot` command is missing. If it still fails, the CLI prints guidance for `where`/`which`, absolute paths, and the `--agent echo` fallback.

# Constraint-Driven Architecture (CDA) CLI

CDA CLI emits deterministic instruction packages that direct AI agents through the layered architecture protocol. The CLI never scans your repository—it loads bundled constraint markdown and outputs authoritative instructions.

> NOTE: `cda run` (default mode) emits **instructions only**. Exit code `0` indicates the package rendered successfully. It does **not** prove architectural compliance.

## Requirements

- Node.js 18 or newer
- npm (for dependency management)

## Installation

### Windows PowerShell (Auto Install or Upgrade)

```powershell
irm https://raw.githubusercontent.com/JohanBellander/CdaCLI/master/scripts/install.ps1 | iex
```

> Need a specific branch? ` $env:CDACLI_BRANCH = 'develop'; irm https://raw.githubusercontent.com/JohanBellander/CdaCLI/master/scripts/install.ps1 | iex `

### macOS / Linux (Auto Install or Upgrade)

```bash
curl -fsSL https://raw.githubusercontent.com/JohanBellander/CdaCLI/master/scripts/install.sh | bash
```

> Use `CDACLI_BRANCH=develop` to target an alternate branch.

### Manual / Development Workflow

```bash
git clone <repo-url>
cd CDATool
npm install
npm run build
npm link   # optional, exposes `cda` globally during development
```

`npm run build` compiles TypeScript sources and copies constraint markdown into `dist/constraints`.

#### Update an Existing Clone Quickly (PowerShell)

```powershell
if (Test-Path CdaCLI) { git -C CdaCLI pull } else { git clone https://github.com/JohanBellander/CdaCLI.git }; cd CdaCLI; npm install; npm run build; npm link --force
```

## Quick Start

Bootstrap CDA in the current repository:

```bash
cda init
```

Generate the minimal onboarding checklist (command sequence + evidence requirements) without touching existing config:

```bash
cda onboard --output CDA-onboarding.md
```

`cda onboard` writes the minimal checklist, and if `cda.config.json` / `cda.agents.json` are missing it scaffolds the same defaults as `cda init`.

List bundled constraints in enforcement order:

```bash
cda list
ORDER  CONSTRAINT_ID                        NAME
-----  -----------------------------------  --------------------------------------
1      domain-no-imports-from-app-or-infra  Domain Cannot Import App or Infra
2      app-no-imports-from-infra            App Cannot Import Infra
...                                         ...
```

Describe a constraint (verbatim markdown sections):

```bash
cda describe domain-no-imports-from-app-or-infra
```

Emit the default batch instruction package (consumed by agents):

```bash
cda run
```

Example output (truncated):

```text
CDA VALIDATION INSTRUCTION PACKAGE (MVP1)
analysis_performed: false
execution_state: unvalidated
instruction_format_version: 2
AGENT ACTION REQUIRED:
  1. Do NOT assume zero violations.
  ...
DO NOT:
- Omit required keys when arrays are empty.
...
===== BEGIN CDA INSTRUCTIONS (TO EXECUTE) =====
run_id: 2025-11-07T12:05:31Z-abc123
mode: batch
CONSTRAINT (INSTRUCTION ONLY - NO DETECTION YET): domain-no-imports-from-app-or-infra
...
```

Generate a single-constraint package:

```bash
cda run --constraint file-naming
# or
cda run --sequential   # alias for the first constraint in enforcement order
```

Plan mode (prompt preview + optional file output):

```bash
cda run --plan --agent copilot-stdin --output prompt.txt
```

Execute via the configured agent:

```bash
cda run --exec --agent copilot
```

All commands exit with `CONFIG_ERROR` if preconditions fail (missing `cda.config.json`, unknown constraint ID, etc.).

## Agent Workflow

1. Run `cda init` once per repository to generate `cda.config.json` (and the full `CDA.md`). Use `cda onboard` when you prefer the minimal checklist version; it also ensures `cda.config.json` and `cda.agents.json` exist.
2. Before writing code, run `cda run --plan` and archive the run_id/prompt as evidence of the directives in force.
3. Implement changes while satisfying all constraints simultaneously (layering, purity, file size, exports, naming, nesting).
4. After changes, run `cda run --exec` (batch or `--constraint`/`--sequential`) and remediate until the report shows zero violations.
5. Rerun `cda init` whenever bundled constraints change so the generated `CDA.md` stays authoritative.

## Error Codes

| Code           | Meaning                                                                           |
|----------------|-----------------------------------------------------------------------------------|
| `CONFIG_ERROR` | Invalid CLI usage (e.g., rerunning `cda init`, unknown constraint id).            |
| `BUNDLE_ERROR` | Constraint markdown is malformed (missing sections, duplicate headers, etc.).    |
| `IO_ERROR`     | Filesystem failures (write/read issues).                                          |
| `FATAL`        | Unexpected internal error.                                                        |

All error codes exit with status `1` and a descriptive message.

## Troubleshooting

- **`CONFIG_ERROR: cda.config.json already exists`** – Run `cda init` only once per repo (delete config only if you intend to rebootstrap).
- **`BUNDLE_ERROR [...] Missing section 'PURPOSE'`** – Repair the referenced markdown file; all 16 sections must exist and be ordered.
- **CLI not found after build** – Run `npm link` (development) or `node dist/cli/index.js <command>`.
- **Snapshots/tests failing** – Regenerate via `npm run test` after intentional structural changes, then inspect `tests/__snapshots__`.
- **`cda run --exec` warns about missing config** – Create `cda.agents.json` (rerun `cda init` or supply your own). Plan mode still emits prompts; execution remains disabled until the file exists.
- **`Unable to spawn 'copilot'`** – Install the standalone Copilot CLI or switch to the Echo agent (`--agent echo`) to verify prompts while you repair the installation.

## Constraint Configuration

- `cda init` scaffolds a `constraint_overrides` object inside `cda.config.json`:

```json
{
  "constraint_overrides": {
    "constraint-id": { "enabled": false }
  }
}
```

- Any constraint can be disabled (`enabled: false`) or re-enabled (`true`) without touching markdown.
- Disabled constraints automatically drop out of `cda list` and every `cda run` mode. Prompts include a `disabled_constraints` metadata line, and single-constraint requests raise `CONFIG_ERROR` if you target a disabled id.
- See `SPECIFICATION_ALL_OPTIONAL.md` for full details.

## Full-Stack Constraint Bundle

Beginning with the 0.5.3 line, all 21 bundled constraints live under `src/constraints/core` (the original directory now also hosts the cross-layer guardrails from `FULL_STACK_CONSTRAINT_SPEC.md`). Use `cda list` to confirm availability after upgrading.

### New guardrails

| Constraint ID                     | Intent summary                                                                 |
|----------------------------------|--------------------------------------------------------------------------------|
| `clean-layer-direction`          | Maintain strict UI -> App -> Domain -> Infra dependency flow and break cycles.  |
| `domain-purity`                  | Keep `src/domain/**` free from IO, globals, randomness, and framework imports. |
| `ports-and-adapters-integrity`   | Require interface-only ports plus adapters that explicitly implement them.     |
| `central-config-entrypoint`      | Funnel every `process.env`/secret read through `src/infra/config/index.ts`.     |
| `structural-naming-consistency`  | Align feature folder slugs/entry files across UI/App/Domain/Infra layers.      |
| `module-complexity-guardrails`   | Enforce tight bounds on module lines, exports, and cyclomatic complexity.      |
| `ui-isolation`                   | Block UI components from calling services/infra directly; require presenters.  |
| `api-boundary-hygiene`           | Keep controllers transport-only with DTO↔domain mappers and service indirection.|
| `observability-discipline`       | Route logging/metrics through shared telemetry adapters with context.          |
| `test-coverage-contracts`        | Mirror every production module with the correct test type (unit/integration/UI).|

Each markdown file contains the formal PURPOSE/SCOPE/VALIDATION sections described in `FULL_STACK_CONSTRAINT_SPEC.md` and the implementation plan in `IMPLEMENTATION_PLAN_FULL_STACK_CONSTRAINTS.md`.

### Enablement steps

1. Upgrade to the latest CDA CLI (`npm install && npm run build` inside the repo consuming CDA).
2. Run `cda run --plan` (or `cda run --plan --constraint <id>`) to review the new instructions. `cda list` now shows all 21 bundled ids.
3. Re-run `cda init` (or `cda onboard`) in repositories that rely on the generated `CDA.md` so the playbook includes the new guardrails. If `cda init` is blocked because config files already exist, delete only `CDA.md` before regenerating.
4. Update automation or teams by sharing the roll-out notes (`CHANGELOG.md`) and linking directly to `FULL_STACK_CONSTRAINT_SPEC.md` for remediation detail.

### Configuration guidance

- All ten constraints are enabled by default but marked optional so they can be scoped per-repo:

```json
{
  "constraint_overrides": {
    "ui-isolation": { "enabled": false },
    "observability-discipline": { "enabled": true }
  }
}
```

- Use `cda describe <id>` to pull the rendered markdown for individual constraints.
- The new bundle increases prompt size; ensure your agent definitions (see `cda.agents.json`) have a `max_length` budget >= 35k characters (the default Copilot arg-mode entry is now 40k).
- Refer to `FULL_STACK_CONSTRAINT_SPEC.md` for the exhaustive detection heuristics, remediation steps, and report fields that enforcement agents must follow.
- Use `history/FULL_STACK_FEEDBACK_PLAN.md` to capture adopter feedback, log beads, and schedule refinement work for noisy heuristics.

## Development Scripts

- `npm run build` – Compile TypeScript and copy constraints to `dist/constraints`.
- `npm run test` – Execute the Vitest suite (loader integrity, error taxonomy, emitter snapshots).
- `npm run typecheck` – Run TypeScript with `--noEmit`.
- `npm run dev` – `tsc --watch` for local iteration.

## Spec Changes

- Instruction format version `2` (Spec Update 1) introduced the banner, execution-state flags, sentinel markers, AGENT ACTION REQUIRED / DO NOT blocks, and the expanded report skeleton.
- Spec Update 2 added the prompt assembler, agent config scaffolding, and the second-person `CDA.md` playbook. Release `0.5.1` consolidated the workflow under `cda run` while keeping legacy wrappers through `0.6.0`; release `0.5.2` layered on the quick-start checklist and mandatory `cda run --exec` evidence; release `0.5.3` introduces `cda onboard` for generating the minimal command/evidence checklist while ensuring config and agent scaffolds exist.
