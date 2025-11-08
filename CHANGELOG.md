# Changelog

## 0.2.0 — 2025-11-08
- Added `cda agent` command for agent-agnostic verification prompts (dry-run/no-exec/legacy flags, stdin execution).
- Introduced prompt assembler with banner, metadata, directive block, and token metrics.
- Added agent config loader (`cda.agents.json`) with scaffolding via `cda init`.
- Regenerated `CDA.md` with full second-person blueprint per Spec Update 2.
- Added Vitest coverage for config loading, prompt assembly, agent command paths, and init scaffolding.
