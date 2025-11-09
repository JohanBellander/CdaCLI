# CDA CLI Tool Specification (Current State)

## 1. Purpose & Scope
The Constraint-Driven Architecture CLI (`cda`) emits deterministic instruction packages describing how autonomous agents must enforce architectural constraints. The CLI never inspects repository source code directly. Its responsibilities are:
- bootstrap repositories with CDA guidance and agent configuration (`cda init`),
- surface bundled constraint metadata (`cda list`, `cda describe`),
- emit instruction packages and report templates (`cda validate`), and
- wrap those instruction packages into agent-ready prompts and optionally invoke external tooling (`cda agent`).

## 2. Goals
- Deliver authoritative, repeatable instructions that external agents can execute without heuristic interpretation.
- Maintain strict separation between instruction emission and validation execution (agents perform detection/remediation).
- Provide second-person operational playbooks (`CDA.md`) that leave no ambiguity for autonomous agents.
- Offer an agent-wrapper command capable of streaming prompts to external CLIs with Windows-safe fallbacks.

## 3. Non-Goals
- Static analysis of project code within the CLI.
- Dynamic configuration of constraint thresholds or enable/disable flags (all bundled constraints are always enabled).
- Automated parsing of external agent responses.
- Remote constraint fetching or marketplace support.
- Multi-agent orchestration beyond selecting a single configured agent.

## 4. Runtime Environment & Packaging
- Node.js 18 or newer (see `package.json` `engines.node`).
- Distributed as an npm package with TypeScript sources compiled into `dist/` via `npm run build`.
- Optional Windows standalone executable built with `npm run build:exe` (uses `pkg`).
- Default install flow: `npm install`, `npm run build`, `npm link` (for global dev use).

## 5. Constraint Asset Model
- Bundled markdown constraints reside in `src/constraints/core`. Each file must contain YAML frontmatter and the 16 mandatory sections defined by `CONSTRAINT_SECTION_ORDER`:
  1. HEADER (key-value block with `constraint_id`, `severity`, `enforcement_order`).
  2. PURPOSE
  3. SCOPE
  4. DEFINITIONS
  5. FORBIDDEN
  6. ALLOWED
  7. REQUIRED DATA COLLECTION
  8. VALIDATION ALGORITHM (PSEUDOCODE)
  9. REPORTING CONTRACT
  10. FIX SEQUENCE (STRICT)
  11. REVALIDATION LOOP
  12. SUCCESS CRITERIA (MUST)
  13. FAILURE HANDLING
  14. COMMON MISTAKES
  15. POST-FIX ASSERTIONS
  16. FINAL REPORT SAMPLE
- `loadConstraints` enforces frontmatter types, section ordering, non-empty content, severity consistency (`error` only), and alignment between frontmatter `id` and HEADER `constraint_id`.
- Constraints are sorted by `enforcement_order` (ties resolved by `id`) before being surfaced to the CLI.
- Default ignored paths for instruction packages: `node_modules`, `dist`, `build`, `.git`.

## 6. Generated Artifacts (`cda init`)
- Writes `cda.config.json` containing `{ "version": 1, "constraints": "builtin", "constraint_overrides": {} }`. The overrides object maps constraint ids to `{ "enabled": true|false }` and is used to toggle optional rules (see `SPECIFICATION_OPTIONAL.md`).
- Generates `CDA.md` via `buildCdaGuide`, producing a second-person, imperative playbook that covers:
  - high-level purpose and core principles,
  - constraint summary table with intent statements,
  - per-constraint detection/remediation guidance (rendered sections from constraint markdown),
  - command usage sequencing, detection/remediation protocol, reporting templates, outcome actions, escalation guidance, token management, forbidden shortcuts, version linkage, validation checklist (10 MUST items), future enhancements (informative), and a mandatory reminder that all instructions are binding.
- Unless `--no-agents` is passed and no prior config exists, scaffolds `cda.agents.json` with three agents (defaulting to the stdin variant):
  - `copilot-stdin` (default, stdin mode) → command `copilot`, args `--model gpt-5 --allow-all-tools --allow-all-paths`, detection-only preamble/postscript, `agent_model: gpt-5`.
  - `copilot` (arg mode) → same command/args, `prompt_arg_flag: -p`, detection-only preamble/postscript, `max_length: 8000`, `agent_model: gpt-5` (the CLI falls back to `--prompt-file` automatically when inline prompts exceed Windows limits).
  - `echo` (stdin mode) → diagnostic agent that echoes prompts.
- `cda init` aborts if `cda.config.json` already exists; it never overwrites existing `cda.agents.json`.
- Optional constraints are annotated `(Optional)` in the generated `CDA.md`. They are omitted entirely when disabled via `constraint_overrides`.

## 7. CLI Commands
### 7.1 `cda init [--no-agents]`
- Creates `cda.config.json` and `CDA.md`. Conditionally scaffolds `cda.agents.json` unless skipped or already present.
- `--no-agents` prevents agent config creation but still prints success summaries.

### 7.2 `cda list`
- Loads bundled constraints (respecting `constraint_overrides`) and prints a fixed-width table containing `order`, `constraint_id`, `name`, and `status`. Status values: `active`, `disabled`. Output remains sorted by enforcement order.

### 7.3 `cda describe <constraint_id>`
- Emits selected sections (PURPOSE, VALIDATION ALGORITHM, REPORTING CONTRACT, FIX SEQUENCE, SUCCESS CRITERIA, POST-FIX ASSERTIONS) for active constraints.
- Errors with `CONFIG_ERROR` if the constraint id is unknown **or** disabled by configuration.

### 7.4 `cda validate [--constraint <id>|--sequential] [--legacy-format]`
- Generates instruction packages with a fresh `run_id` (ISO timestamp + 6-character base36 suffix) using only active constraints (after applying `constraint_overrides`).
- Modes:
  - Batch (default) → includes all constraints.
  - Single (`--constraint <id>`) → emits selected constraint.
  - Sequential (`--sequential`) → alias for the first constraint in recommended order.
- `--legacy-format` omits Spec Update 1/2 decorations, restoring the pre-update layout.
- Throws `CONFIG_ERROR` if unknown options are provided, mutually exclusive flags are combined, no active constraints remain, or a disabled constraint id is requested explicitly.

### 7.5 `cda agent [options]`
- Options: `--agent <name>`, `--constraint <id>`, `--sequential`, `--dry-run`, `--no-exec`, `--output <path>`, `--legacy-format`, `--help`.
- Always assembles instruction text via `buildBatchInstructionPackage` or `buildSingleInstructionPackage`. Legacy flag passes through to formatter/assembler.
- Attempts to load `cda.agents.json` when present. Resolution order: explicit `--agent`, config `default`, fallback `copilot-stdin` entry, then `copilot`.
- When config absent, emits a warning and prints the prompt without spawning any agent process, regardless of `--dry-run`.
- Prompt assembly (`assemblePrompt`):
  - Non-legacy prompts prepend metadata banner, run metadata, `instruction_format_version: 2`, `agent_name`, optional `agent_model`, `token_estimate_method`, and `disabled_constraints: []` (list of ids skipped by configuration).
  - Optional `prompt_preamble`/`postscript` from config flank the instruction text.
  - Appends a directive block that enforces detection-only execution (no fixes, no shell commands) and prescribes report population rules.
  - Adds `original_char_count` and `approx_token_length` (char count ÷ 4 heuristic).
- Execution path (active constraints only):
  - `--output <path>` writes the assembled prompt to disk (overwrites existing file) before further processing.
  - `--no-exec` implies `--dry-run`, suppresses command preview, and prints only the prompt.
  - `--dry-run` prints the fully quoted command line (including fallback `--prompt-file` when triggered) and the prompt content.
  - Without `--dry-run`, spawns the external command:
  - `mode: arg` → passes prompt inline via `prompt_arg_flag` unless Windows length estimation exceeds `getWindowsArgLimit` (default 8000). In that case, writes the prompt to `%TEMP%/cda-agent-prompt-<run_id>.txt`, uses `prompt_file_arg` (or the default `--prompt-file` when unspecified), logs the fallback, and cleans up the temp file afterward.
    - When inline delivery stays under the limit but the composed command exceeds ~7000 characters on Windows, logs a warning with mitigation guidance (reduce constraints, switch to `mode: "stdin"`, or capture the prompt via `--dry-run`) before execution.
    - `mode: stdin` → pipes prompt via stdin.
    - On Windows, commands without explicit extension are retried as `<command>.cmd` executed through `cmd.exe /c`.
  - Non-zero child exit codes are logged as warnings but do not change CDA’s exit code.

## 8. Instruction Package Structure (Default Format)
### 8.1 Banner & Guidance
- Batch header lines:
  - `CDA VALIDATION INSTRUCTION PACKAGE (MVP1)`
  - `analysis_performed: false`
  - `execution_state: unvalidated`
  - `INSTRUCTION PACKAGE ONLY - NO SOURCE ANALYSIS PERFORMED - AGENT MUST EXECUTE DETECTION STEPS`
  - `NOTE: CLI EXIT CODE 0 DOES NOT INDICATE ARCHITECTURAL COMPLIANCE.`
  - `instruction_format_version: 2`
- Followed by the `AGENT ACTION REQUIRED` block (5 numbered directives covering detection, remediation, and report completion) and the `DO NOT` block (5 prohibitions).

### 8.2 Sentinel Sections
- `===== BEGIN CDA INSTRUCTIONS (TO EXECUTE) =====`
  - `run_id`, `mode`, `recommended_order`, `ignored_paths`.
  - For each constraint: `CONSTRAINT (INSTRUCTION ONLY - NO DETECTION YET): <id>`, `enforcement_order`, `objective`, numbered `detection_steps`, `report_fields`, `pass_criteria`, `fix_strategy`, and checklist items from `POST-FIX ASSERTIONS`.
- `===== END CDA INSTRUCTIONS =====`
- `===== BEGIN EXPECTED AGENT REPORT FORMAT (FILL AFTER EXECUTION) =====`
  - Report template fields described below.
- `===== END EXPECTED AGENT REPORT FORMAT =====`

### 8.3 Batch Report Template
```
report_kind: cda_validation_result
run_id: <run_id>
execution_state: unvalidated
analysis_performed: false
summary:
  analyzed_files: 0
  constraints_evaluated: <constraint count>
  total_violations: 0
enumerated_files_count: 0
constraint_blocks_received: <constraint count>
violations: []
fixes_applied: []
initial_violation_count: 0
remaining_violation_count: 0
post_fix_status:
  revalidated: false
  remaining_violations: 0
revalidation_attempts_used: 0
success_conditions:
  all_constraints_evaluated: false
  no_remaining_violations: false
self_audit:
  all_constraints_present: false
  all_required_fields_populated: false
  revalidation_attempts_documented: false
  schema_conformance: false
agent_execution_signature: null
completion_timestamp: null
status: null
```

### 8.4 Single-Constraint Report Template
```
report_kind: cda_single_constraint_validation_result
run_id: <run_id>
constraint_id: <constraint id>
execution_state: unvalidated
analysis_performed: false
constraint_blocks_received: 1
enumerated_files_count: 0
violations: []
fixes_applied: []
initial_violation_count: 0
remaining_violation_count: 0
post_fix_status:
  revalidated: false
  remaining_violations: 0
revalidation_attempts_used: 0
success_conditions:
  all_constraints_evaluated: false
  no_remaining_violations: false
self_audit:
  all_constraints_present: false
  all_required_fields_populated: false
  revalidation_attempts_documented: false
  schema_conformance: false
agent_execution_signature: null
completion_timestamp: null
status: null
```

### 8.5 Legacy Format (Spec v1)
- Headers exclude analysis/state fields and guidance blocks.
- Per-constraint headers read `CONSTRAINT: <id>` without the instruction disclaimer.
- Footer is labeled `REPORT TEMPLATE` with minimal summary fields for batch mode and the MVP1 schema (`revalidated_zero`) for single mode.
- Available via `--legacy-format` on both `validate` and `agent` commands.

## 9. Agent Prompt Directive (Non-Legacy)
- After the instruction package, `assemblePrompt` appends the `AGENT DIRECTIVE` block (6 lines) that explicitly instructs agents to:
  1. Operate in detection-only mode (no fixes or code modifications).
  2. Avoid shell commands; rely solely on file-reading tools.
  3. Populate the expected report exactly.
  4. Report all violations, leave `fixes_applied` empty.
  5. Set `execution_state` to `validated` when detection completes successfully.
  6. Include every detected violation.
- The directive intentionally narrows the `AGENT ACTION REQUIRED` guidance when prompts are routed through `cda agent`, ensuring verification runs do not mutate code.

## 10. Agent Configuration Schema (`cda.agents.json`)
- Top level: optional `default` field (string), required `agents` object.
- Each agent definition (`AgentDefinition`):
  - `command`: executable name/path (string, required).
  - `args`: array of strings (optional, defaults to []).
  - `mode`: `"stdin"` or `"arg"` (required).
  - `prompt_arg_flag`: string (optional, defaults to `-p` when omitted for arg mode).
  - `prompt_file_arg`: string (optional, defaults to `--prompt-file` for fallback).
  - `prompt_preamble` / `postscript`: optional strings appended around the instruction text.
  - `max_length`: positive integer (optional) used to hard-limit `promptResult.charCount`.
  - `agent_model`: optional string for metadata display.
- Validation rules (`loadAgentConfig`):
  - File must exist unless `required: false` is passed.
  - JSON must parse to an object with a non-empty `agents` map.
  - All string fields must be non-empty where required.
  - Invalid modes, missing defaults, and malformed arrays raise `CONFIG_ERROR` with descriptive messages.
- `resolveAgent` precedence: requested agent → configured default → `copilot` key; throws when none resolve.

## 11. Error Handling
- Custom `CdaError` codes: `FATAL`, `CONFIG_ERROR`, `BUNDLE_ERROR`, `IO_ERROR` (all map to exit code 1).
- CLI dispatch (`src/cli/index.ts`) catches errors, prints `<CODE>: <message>` for known errors, or `FATAL: <stack>` for unexpected exceptions.
- Examples:
  - Rerunning `cda init` when config exists → `CONFIG_ERROR`.
  - Missing constraint sections → `BUNDLE_ERROR`.
  - Unknown CLI options → `CONFIG_ERROR`.
  - Unable to spawn external command → `FATAL` with diagnostic guidance.

## 12. Build & Test Suite
- `npm run build` → TypeScript compile + copy constraint markdown.
- `npm run test` → Vitest suite covering:
  - Constraint loading validation.
  - Instruction emitter snapshots.
  - CLI formatter structure (sentinel markers, guidance blocks).
  - Run ID generation behavior.
  - Agent prompt assembly, dry-run output, command planning, Windows fallbacks, and error mapping.
- Tests rely on fixtures under `tests/fixtures` for agent configs and malformed constraint cases.

## 13. Active Constraints (Bundled)
1. `domain-no-imports-from-app-or-infra`
2. `app-no-imports-from-infra`
3. `domain-no-side-effects`
4. `max-file-lines`
5. `single-responsibility`
6. `excessive-nesting`
7. `file-naming`
8. `folder-naming`

All constraints are enforced in every instruction package with their canonical enforcement order.

## 14. Versioning & Compatibility
- `INSTRUCTION_FORMAT_VERSION` constant is `2`. Increment this when structural changes affect instruction packages or prompts.
- `--legacy-format` maintains compatibility with Spec Version 1 output for both validation and agent prompts; downstream tooling choosing legacy mode forfeits the guidance banner, directive block, and char/token metrics.
- Agent prompts include `original_char_count` and `approx_token_length`; these values are used to enforce `max_length` and surfaced for downstream logging.

## 15. Known Limitations & Future Hooks
- CLI does not yet parse agent responses or audit compliance; prompts instruct agents to self-attest via `agent_execution_signature`.
- Prompt length heuristic assumes ~4 characters per token; real model limits may vary.
- Windows command-line fallback writes temporary files but does not currently handle collisions beyond run-specific filenames.
- Further extensions (multi-agent chaining, schema validation of responses, remote constraint packs) remain outside the current implementation.
