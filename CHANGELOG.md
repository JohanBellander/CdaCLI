# Changelog

# Changelog

## 0.2.2 — 2025-11-08
- Added Windows arg-mode fallback: when Copilot prompts exceed the ~8K Windows command-line limit the CLI now writes the prompt to a sanitized temp file, swaps in `--prompt-file <path>`, surfaces the path in dry-run output, and cleans the file after execution.
- Extended agent config schema (code, README, spec, fixtures, `cda init`) with optional `prompt_arg_flag`/`prompt_file_arg` fields so other agents can customize inline/file flags; updated tests to cover the new behavior.
- Improved dry-run and execution logging to mention prompt-file fallback when triggered.

## 0.2.1 — 2025-11-08
- Corrected Copilot agent invocation to use the standalone `copilot` CLI with `-p` prompt arguments (arg mode); stdin mode remains supported for echo/custom agents.
- Added agent config schema support for `mode: "arg"`, updated init scaffolding, docs, and fixtures.
- Adjusted agent execution pipeline/tests to ensure arg-mode commands skip stdin piping and honor max-length checks.

## 0.2.0 — 2025-11-08
- Added `cda agent` command for agent-agnostic verification prompts (dry-run/no-exec/legacy flags, stdin execution).
- Introduced prompt assembler with banner, metadata, directive block, and token metrics.
- Added agent config loader (`cda.agents.json`) with scaffolding via `cda init`.
- Regenerated `CDA.md` with full second-person blueprint per Spec Update 2.
- Added Vitest coverage for config loading, prompt assembly, agent command paths, and init scaffolding.
