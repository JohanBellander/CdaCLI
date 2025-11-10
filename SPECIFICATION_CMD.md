# Command Architecture Revision: Single `cda run` Entry Point

## Motivation

The current CLI splits workflow steps across separate commands (`cda list`, `cda describe`, `cda agent`, `cda validate`). While powerful, the command set introduces friction for new adopters and complicates automation scripts that need to switch between planning and execution. Consolidating execution-oriented functionality behind a single `cda run` entry point, with flags determining behavior, simplifies the mental model and aligns with the agent-first usage pattern.

### Goals

- Provide a streamlined workflow: plan instructions → execute with an external agent → verify results locally.
- Reduce the number of top-level commands users must memorize.
- Maintain backward compatibility for existing scripts via aliases.
- Preserve the ability to inspect constraint bundles independently of execution.

### Non-Goals

- Alter the underlying constraint loader, instruction assembler, or reporting contracts.
- Change the structure of the generated instruction package.
- Remove existing commands immediately; deprecation and documentation updates will be staged.

## High-Level Design

### Command Overview

- `cda run` becomes the primary entry point for execution workflows.
- Flags determine the operating mode:
  - No flags: run local validation (current `cda validate`).
  - `--plan`: assemble and print the instruction package without invoking external agents (current `cda agent --dry-run`).
  - `--exec`: invoke the configured external agent after rendering the instruction package (current `cda agent`).
  - `--audit`: rerun the instruction package with an alternative agent profile (intended for peer review).
  - Additional support flags (`--constraint`, `--sequential`, `--agent`, `--legacy-format`, etc.) remain available and retain their current semantics.

### Supporting Commands

- `cda list` remains to enumerate constraints; messaging will reference `cda run --plan` for deeper inspection.
- `cda describe <id>` remains for detailed documentation of individual constraints.
- A new help section (or alias) may surface an onboarding flow (`cda help run`) summarizing the recommended sequence.

### Flag Semantics

| Flag | Purpose | Notes |
| --- | --- | --- |
| *(default)* | Local validation pass | Equivalent to `cda validate`. Exits non-zero on constraint violation. |
| `--plan` | Produce instruction package only | Prints batch or single-instruction package depending on constraint selection. Can be combined with `--output` to save the prompt. |
| `--exec` | Assemble and run through external agent | Mirrors today’s `cda agent`. Fails if the configured `command` is missing. |
| `--audit` | Run the instruction package with an alternate agent configuration | Expects `--audit-agent <name>` or defaults to a configured auditor profile. Does not mutate code; intended for secondary verification. |
| `--constraint <id>` | Narrow scope to a single constraint | Works in all modes. Conflicts with `--sequential`. |
| `--sequential` | Generate sequential instructions | Same behavior as current flag; only permitted with batch execution. |
| `--agent <name>` | Override the default agent definition | Applies to `--exec` and `--audit` modes. |
| `--legacy-format` | Emit legacy instruction format | Maintains compatibility for downstream tooling that expects older layout. |
| `--output <file>` | Write instruction package to file | Valid with `--plan` or `--exec` (writes before execution). |

### Flag Interactions

- `--plan` and `--exec` are mutually exclusive. Attempting to supply both should produce a usage error with guidance ("Run twice: once with --plan, once with --exec").
- `--audit` is incompatible with `--exec`; it represents a distinct execution path intended for secondary agents.
- `--plan` + `--output` persists the assembled prompt without running external commands.
- `--exec` + `--output` mirrors current behavior: write prompt to file, then execute.

### Backward Compatibility

- Retain legacy commands as thin wrappers:
  - `cda validate` → `cda run`
  - `cda agent --dry-run` → `cda run --plan`
  - `cda agent` → `cda run --exec`
- Mark wrappers as deprecated in help text and documentation, with a sunset plan (e.g., removal in 0.6.0).
- Clean up the old workflow as soon as the new command structure ships: delete wrapper commands, remove redundant documentation sections, and prune tests/fixtures that target the legacy entry points. Schedule the removal for the immediate follow-up release (tentatively 0.6.0).

### Help & Documentation

- Update `README.md` and onboarding materials to highlight the new command flow.
- Provide a quick-reference table mapping old commands to new flag combinations.
- Update `CDA.md` generation and init scaffolding to reference `cda run` for validation/execution instructions.

### Testing Strategy

- Re-map existing Vitest coverage to the new entry point (e.g., rename `agentCommandDryRun` → `runPlanMode` suites).
- Add integration tests ensuring flag exclusivity and error handling (e.g., `--plan --exec` should throw). 
- Preserve fixtures to ensure instruction assembly remains unchanged across refactors.

## Open Questions

1. Should `--audit` be implemented in the initial release, or reserved for a future version?
2. How should we expose onboarding guidance—new command (`cda help run`), or enhanced output from `cda list`?
3. Do we need separate logging for each mode to assist automation (e.g., `mode=plan` in stdout)?

## Rollout Plan

1. Implement `cda run` with new flag handling while keeping existing commands.
2. Update documentation and command help to feature the new workflow.
3. Release as version 0.5.0 with legacy command aliases marked deprecated.
4. Collect feedback; remove deprecated aliases in a later major/minor release once adoption stabilizes.
