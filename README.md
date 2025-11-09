# Constraint-Driven Architecture CLI (CDA)
## Agent Verification Command (MVP)

The `cda agent` command assembles an agent-ready verification prompt (wrapping the standard instruction package) and can optionally invoke an external AI CLI (e.g. GitHub Copilot CLI) via stdin.

### Usage

```
cda agent [--constraint <id> | --sequential] [--agent <name>] [--dry-run] [--no-exec]
          [--output <file>] [--legacy-format]
```

Flags:
- `--agent <name>`: Select an agent defined in `cda.agents.json`. Resolution order: explicit `--agent`, then the `default` field, then `copilot` if present. Unknown names raise `CONFIG_ERROR`.
- `--constraint <id>` / `--sequential`: Single-constraint modes (mirrors `cda validate`). Omit both for batch prompts.
- `--dry-run`: Print the prompt and intended command without executing external tooling.
- `--no-exec`: Print only the prompt body (implies `--dry-run` and suppresses the command preview).
- `--output <file>`: Overwrite the specified file with the assembled prompt.
- `--legacy-format`: Suppress the agent wrapper banner, directive block, and metrics—output matches the pre-Spec-Update-1 instruction package.

### Prompt Structure
Dry-run output (and the prompt sent to agents) always follows this order:
1. Banner: `AGENT VERIFICATION MODE: PROMPT INTENDED FOR AUTOMATED EXECUTION`.
2. Metadata block: `run_id`, ISO timestamp, `instruction_format_version`, `agent_name`, optional `agent_model`, `token_estimate_method`.
3. Optional `prompt_preamble` from the agent config.
4. Raw instruction package emitted by `cda validate` (batch or single) with AGENT ACTION REQUIRED / DO NOT blocks, sentinel markers, and expanded report skeleton.
5. Directive block reminding the agent to execute detection/remediation steps and populate the EXPECTED AGENT REPORT FORMAT exactly as written.
6. Optional `postscript` from the agent config.
7. Metrics: `original_char_count` and `approx_token_length` (simple chars ÷ 4 heuristic). These are checked against any `max_length` defined in the agent config.

### Sample `cda.agents.json`
`cda init` scaffolds a default config unless `--no-agents` is provided. Copilot + Echo agents are included:
```json
{
  "default": "copilot",
  "agents": {
    "copilot": {
      "command": "copilot",
      "args": ["--model", "gpt-5", "--allow-all-tools"],
      "mode": "arg",
      "prompt_arg_flag": "-p",
      "prompt_file_arg": "--prompt-file",
      "prompt_preamble": "You are a verification agent. Execute CDA architectural constraint detection steps strictly.",
      "postscript": "Return ONLY the populated agent report format. Do not paraphrase instructions.",
      "max_length": 20000,
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
Echo simply prints the prompt—useful for verifying formatting or debugging pipelines.

### Notes
- If `cda.agents.json` is missing, `cda agent --dry-run` still emits a prompt (attempting to execute prints a warning and exits 0).
- Execution supports two modes: `stdin` (prompt piped via stdin, recommended for Windows) and `arg` (prompt passed via `-p` flag).
- **Windows Command Line Limits**: The `arg` mode can fail with long prompts due to ~8K command-line limits. CDA displays a warning when prompts exceed 7000 characters. **Solution**: Use `copilot-stdin` agent (automatically created by `cda init`) or reduce constraints with `--constraint <id>`.
- On Windows, when an `arg`-mode prompt would exceed the ~8K command-line limit, CDA writes the prompt to a temp file and swaps in `--prompt-file <path>` (configurable via `prompt_file_arg`) so the Copilot CLI reads from disk instead of inline args.
- Exit codes reflect CDA errors (config, spawn issues, etc.). The agent's stdout/stderr are streamed directly but **not** interpreted by CDA.
- `--allow-all-tools` (included in the Copilot example) grants the Copilot CLI broader permissions—enable only in trusted environments and document the risk acceptance.
- Use `--legacy-format` when the downstream model cannot handle the banner/directive/metrics additions introduced in instruction format version 2.

### Copilot CLI Setup

> **Windows Users**: If you encounter "No specific task provided" or argument length errors, switch to stdin mode by changing the `default` agent in `cda.agents.json` to `"copilot-stdin"`. This bypasses Windows command-line length limits and reliably delivers long prompts. The stdin mode is automatically included when running `cda init`.

1. **Install the standalone `copilot` binary** using GitHub's official instructions (see the [Copilot CLI docs](https://docs.github.com/en/copilot/github-copilot-chat/copilot-cli)) or a package manager:
   - macOS/Linux (Homebrew): `brew install github-copilot-cli`
   - Windows (winget): `winget install GitHub.CopilotCLI`
   - Universal fallback: `npm install -g @githubnext/github-copilot-cli`
2. **Verify the executable is on `PATH`:**
   - Windows: `where copilot`
   - macOS/Linux: `which copilot`
   If these commands fail, set `agents.copilot.command` in `cda.agents.json` to the absolute path (for example, `C:\\Users\\me\\AppData\\Local\\Programs\\copilot\\copilot.exe`).
3. **Fallback strategies when execution fails:**
   - Switch to the bundled `echo` agent (`--agent echo`) to inspect prompts safely while diagnosing installation or security constraints (see bead CDATool-z76).
   - If your Copilot build lacks `--prompt-file`, set the agent `mode` to `"stdin"` so CDA streams the prompt via stdin.
   - For prompts that must stay inline but exceed command-line limits, lower the constraint scope or temporarily use a stdin-capable agent until your Copilot CLI supports file-based prompts (design context: bead CDATool-2wc).
4. **Re-run `copilot auth login`** whenever GitHub tokens expire; CDA surfaces spawn errors but does not manage authentication on your behalf.
5. **CDA automatically retries `copilot.cmd` on Windows** when the shimmed `copilot` command is missing; if it still fails, the CLI prints guidance to run `where`/`which`, set an absolute path, or fall back to `--agent echo` while you repair the installation.

# Constraint-Driven Architecture (CDA) CLI

CDA CLI emits deterministic instruction packages that guide AI agents through layered architecture enforcement. The tool never scans your codebase directly--instead it loads bundled constraint markdown files and exposes them through `cda` commands.

> NOTE: `cda validate` emits **instructions only**. Exit code `0` means the instruction package was generated successfully—it does **not** indicate architectural compliance.

## Requirements

- Node.js 18 or newer
- npm (for installing dependencies)

## Installation

### Windows PowerShell One-Liner

For a fresh clone, install dependencies, build, and link globally:

```powershell
git clone https://github.com/JohanBellander/CdaCLI.git; cd CdaCLI; npm install; npm run build; npm link
```

### Standard Steps

```bash
git clone <repo-url>
cd CDATool
npm install
npm run build
npm link   # optional, exposes `cda` globally during development
```

`npm run build` compiles TypeScript and copies bundled constraint markdown into `dist/constraints`.

## Quick Start

Initialize CDA in the current repository (creates `cda.config.json` + `CDA.md`):

```bash
cda init
```
`cda init --no-agents` skips creation of `cda.agents.json` (useful for repositories that manage agent configs elsewhere). Re-running `cda init` in an existing directory still aborts to protect `cda.config.json`.

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

Emit a full batch instruction package (consumed by the AI agent):

```bash
cda validate
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
===== END CDA INSTRUCTIONS =====
===== BEGIN EXPECTED AGENT REPORT FORMAT (FILL AFTER EXECUTION) =====
report_kind: cda_validation_result
analysis_performed: false
constraint_blocks_received: 8
success_conditions:
  all_constraints_evaluated: false
  no_remaining_violations: false
self_audit:
  all_constraints_present: false
  ...
===== END EXPECTED AGENT REPORT FORMAT =====
```

Run a single constraint in recommended sequence:

```bash
cda validate --constraint file-naming
# or:
cda validate --sequential   # alias for the first constraint
```

All commands exit with `CONFIG_ERROR` if preconditions are not met (for example, missing `cda.config.json` when running validate/list/describe, or rerunning `init` in a directory that already contains configuration).

## Agent Workflow

1. Run `cda init` once per repository to generate `CDA.md` (authoritative enforcement protocols) and `cda.config.json`.
2. Before writing code, run `cda validate` and ensure zero violations.
3. Implement changes while respecting every constraint simultaneously (layering, purity, file size, exports, naming, nesting).
4. After changes, rerun `cda validate` (batch or per-constraint sequential mode) and remediate until the agent reports zero violations.
5. Regenerate `CDA.md` whenever bundled constraints change (rerun `cda init`).

## Error Codes

| Code          | Meaning                                                                           |
|---------------|-----------------------------------------------------------------------------------|
| `CONFIG_ERROR` | Invalid CLI usage (e.g., rerunning `cda init`, unknown constraint id).            |
| `BUNDLE_ERROR` | Constraint markdown is malformed (missing sections, duplicate headers, etc.).    |
| `IO_ERROR`     | Filesystem failures (write/read issues).                                          |
| `FATAL`        | Unexpected internal error.                                                        |

All error codes exit with status `1` and a descriptive message.

## Troubleshooting

- **`CONFIG_ERROR: cda.config.json already exists`** -- Run `cda init` only once per repo (delete config only if you intentionally rebootstrap).
- **`BUNDLE_ERROR [...] Missing section 'PURPOSE'`** -- Inspect the referenced markdown file; all 16 authoritative sections must be present and ordered.
- **CLI not found after build** -- Run `npm link` (development) or invoke via `node dist/cli/index.js <command>`.
- **Snapshots/tests failing** -- Regenerate via `npm run test` after intentional structural changes, then review `tests/__snapshots__`.
- **`cda agent` warns about missing config** -- Create `cda.agents.json` (rerun `cda init` or supply your own). Dry-run still emits prompts; execution remains disabled until the file exists.
- **`Unable to spawn 'copilot'`** -- Install the standalone Copilot CLI or switch to the Echo agent (`--agent echo`) to verify prompts without remote execution.

## Optional Constraints

- `cda init` now scaffolds a `constraint_overrides` object inside `cda.config.json`. Use this to toggle optional constraints without deleting their markdown:

```json
{
  "constraint_overrides": {
    "optional-constraint-id": { "enabled": false }
  }
}
```

- Constraints labeled `(Optional)` in `CDA.md` and `cda list` can be disabled (set `enabled: false`) or force-enabled (set `true`). Mandatory constraints ignore overrides.
- Disabled optional constraints automatically drop out of `cda list`, `cda validate`, and `cda agent` outputs. Prompts include a `disabled_constraints` metadata line for auditing, and describe/single-constraint flows raise `CONFIG_ERROR` if you target a disabled id.
- See `SPECIFICATION_OPTIONAL.md` for the full workflow and guardrails.

## Development Scripts

- `npm run build` -- Compile TypeScript and copy constraints to `dist/constraints`.
- `npm run test` -- Execute Vitest suite (loader integrity, error taxonomy, emitter snapshots).
- `npm run typecheck` -- TypeScript compilation with `--noEmit`.
- `npm run dev` -- `tsc --watch` for local iteration.

## Spec Changes

- Instruction format version `2` (Spec Update 1) introduced the banner, execution-state flags, sentinel markers, AGENT ACTION REQUIRED / DO NOT blocks, and the expanded report skeleton.
- Spec Update 2 added the `cda agent` command, prompt assembler, agent config scaffolding, and the second-person `CDA.md` playbook. See `CHANGELOG.md` for release-level details.
