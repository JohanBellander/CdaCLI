# Changelog

## Unreleased
- Added the interactive `cda config` command to the main help/README, documented the TTY-only workflow, and recorded the feature in `CDA.md`/onboarding templates so teams know to manage optional constraints through the new UI.
- Integrated `@clack/prompts` as the TUI driver, added a spike script (`scripts/tuiSpike.mjs`), and expanded the CLI/config helper tests (mandatory-only projects, duplicate state detection) to cover the new behavior.

## 0.5.6 — 2025-11-14
- Improved constraint semantics to reduce false positives in real-world projects:
	- `clean-layer-direction`: Recognizes composition roots (`src/index.ts`, `src/main.ts`, `src/bootstrap.ts`, `src/composition/**`) and allows them to import across layers for dependency wiring.
	- `ui-isolation`: Recognizes adapter implementations (`src/ui/adapters/**`, `src/infra/adapters/**`) and allows HTTP client usage (fetch/axios) when implementing port interfaces.
- All tests passing (82). Documentation follow-up planned to highlight these allowances in README.

## 0.5.5 — 2025-11-13
- Documentation and test suite maintenance release.

## 0.5.4 — 2025-11-13
- **FIXED**: Changed MVC and MVP architectural pattern constraints to be disabled by default (`enabled: false, optional: true`). These constraints are now opt-in patterns that must be explicitly enabled via `constraint_overrides` configuration.
- **BEHAVIOR CHANGE**: Users implementing MVVM (or other patterns) no longer see false-positive violations from MVC/MVP constraints when those patterns are not configured.
- Added comprehensive integration tests verifying config override behavior works correctly across all constraint states.
- Enhanced README with architectural pattern selection guide, configuration examples, and 5-step troubleshooting checklist for config overrides.
- Updated test expectations to reflect MVC/MVP appearing in `disabled_constraints` metadata by default.
- **Upgrade guidance**: If your project uses MVC or MVP patterns, add explicit `constraint_overrides` entries to enable them: `"mvc-layer-separation": { "enabled": true }` or `"mvp-presenter-boundaries": { "enabled": true }`. MVVM remains enabled by default.

## 0.5.3 — 2025-11-13
- Registered ten full-stack architecture constraints (clean-layer-direction, domain-purity, ports-and-adapters-integrity, central-config-entrypoint, structural-naming-consistency, module-complexity-guardrails, ui-isolation, api-boundary-hygiene, observability-discipline, test-coverage-contracts) and bundled them with the existing core guardrails.
- Added `cda onboard` command for generating a minimal CDA onboarding checklist while also scaffolding `cda.config.json` and `cda.agents.json` when missing.
- Documented rollout guidance in `README.md`, including enablement steps, configuration overrides, and references to `FULL_STACK_CONSTRAINT_SPEC.md` / `IMPLEMENTATION_PLAN_FULL_STACK_CONSTRAINTS.md`.
- Increased the default Copilot arg-mode `max_length` budget (fixtures + docs) so the expanded prompt that includes all 21 constraints stays under the configured ceiling.

## 0.5.2 — 2025-11-10
- Enhanced the generated `CDA.md` playbook with an immediate command checklist and an explicit requirement to capture `cda run --exec` results before closing out a session.
- Updated README spec notes to highlight the new guidance for agents following `cda run` workflows.
- Bumped the package to v0.5.2 and prepared release metadata.

## 0.5.1 — 2025-11-10
- Introduced the consolidated `cda run` command with validation/plan/exec modes, flag compatibility checks, and audit placeholder handling (CDATool-jg6, CDATool-x3j).
- Added legacy wrappers for `cda validate`/`cda agent` that reroute through `cda run`, emit v0.6.0 deprecation warnings, and preserve CLI help output (CDATool-b8w).
- Updated README, CDA.md scaffolding, and workflow guidance to highlight the new entry point, document the legacy mapping, and call out the removal timeline (CDATool-5dd).
- Expanded Vitest coverage to exercise `cda run` in default, plan, and exec modes (unit + integration) and tightened flag-conflict assertions (CDATool-1p8).
- Bumped the package to v0.5.1 and recorded the release per bd tracking (CDATool-9hu).

## 0.4.1 — 2025-11-09
- Added three architecture pattern constraints: `mvc-layer-separation`, `mvp-presenter-boundaries`, and `mvvm-binding-integrity`, extending the bundled set to eleven enforced rules.
- Updated specs, documentation, and tests to reflect the expanded constraint list and enforcement order.
- Strengthened the new pattern constraints so they fail when required layers, view interfaces, or MVVM bindings are missing, ensuring teams actively implement the patterns rather than only avoiding cross-layer violations.

## 0.4.0 — 2025-11-09
- **BREAKING**: Removed mandatory constraint guardrails. All bundled constraints can now be disabled via `constraint_overrides` configuration without restrictions.
- Simplified CLI status output: `cda list` now shows only `active` or `disabled` (removed `optional-enabled` and `optional-disabled` states).
- Updated error messages for disabled constraints: changed "disabled by configuration" to "disabled" for brevity.
- Revised documentation (README, SPECIFICATION_NEW.md, CDA.md generator) to remove mandatory constraint language and clarify that any constraint can be toggled.
- Updated skip logging text to "Constraint '<id>' disabled via configuration."
- **Upgrade guidance**: Review your `constraint_overrides` in `cda.config.json`. Previously mandatory constraints can now be disabled if needed. See `SPECIFICATION_ALL_OPTIONAL.md` for full details on the new behavior.

## 0.3.0 — 2025-11-09
- Added optional-constraint parsing and config overrides: `loadConstraints` now honors frontmatter `optional` flags, merges `constraint_overrides` from `cda.config.json`, and blocks disabling mandatory rules.
- Filtered `cda validate`/`cda agent` to active constraints, logging skipped ids, surfacing `disabled_constraints: [...]` metadata in prompts, and rejecting disabled ids in single-constraint modes.
- Expanded CLI UX with a `status` column in `cda list`, describe guards, and agent/validate skip messaging.
- Refreshed `cda init` scaffolding (`constraint_overrides` stub, `(Optional)` labeling in `CDA.md`, optional-toggle guidance) plus README/SPEC updates referencing `SPECIFICATION_OPTIONAL.md`.
- Added fixtures and Vitest coverage for optional flows across loader, list/describe, validate, agent dry-run/exec, and init scaffolding. **Upgrade note:** edit `constraint_overrides` explicitly before disabling `(Optional)` constraints; defaults keep all bundled rules active.

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
