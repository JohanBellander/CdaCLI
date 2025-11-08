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

## Development Scripts

- `npm run build` -- Compile TypeScript and copy constraints to `dist/constraints`.
- `npm run test` -- Execute Vitest suite (loader integrity, error taxonomy, emitter snapshots).
- `npm run typecheck` -- TypeScript compilation with `--noEmit`.
- `npm run dev` -- `tsc --watch` for local iteration.
