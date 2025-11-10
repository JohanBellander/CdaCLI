# Implementation Plan: `cda run` Command Consolidation

## Objective

Implement the command architecture described in `SPECIFICATION_CMD.md`, consolidating execution workflows under `cda run` while keeping legacy commands as temporary wrappers.

## Work Breakdown

### 1. CLI Command Layer
- [ ] Introduce new `run` command entry point in `src/cli/commands/run.ts` (or equivalent).
- [ ] Wire `cda run` into the CLI index (`src/cli/index.ts`) with proper flag parsing.
- [ ] Define flag semantics (`--plan`, `--exec`, `--audit`, `--constraint`, `--sequential`, `--agent`, `--legacy-format`, `--output`).
- [ ] Implement validation to prevent incompatible flag combinations (`--plan` vs `--exec`, `--audit` vs `--exec`).

### 2. Execution Modes
- [ ] **Default / Validation Mode:** Invoke existing validation workflow (current `validate` command). Ensure exit codes mirror `cda validate` behavior.
- [ ] **Plan Mode:** Reuse agent dry-run logic to assemble the instruction package. Support stdout or file output depending on `--output`.
- [ ] **Exec Mode:** Reuse current `agent` execution path, including prompt assembly, optional file output, and external command invocation.
- [ ] **Audit Mode (optional initial scope):** Determine whether to ship in v0.5.0 or defer. If included, allow specifying alternate agent config.

### 3. Backward Compatibility Wrappers
- [ ] Update the existing `validate` command to call into `cda run` default mode (or keep as thin wrapper).
- [ ] Update `agent` command (and dry-run flag) to delegate to `cda run --exec` and `cda run --plan` respectively.
- [ ] Add deprecation warnings/help text for legacy commands.

### 4. Documentation
- [ ] Update `README.md` to feature the new workflow and flags.
- [ ] Amend generated `CDA.md` (and init scaffolding) to reference `cda run` commands.
- [ ] Document transition guidance: map old commands to new flag combos.
- [ ] Reference cleanup plan (legacy commands removed in 0.6.0) in CHANGELOG / docs.

### 5. Testing
- [ ] Repurpose existing Vitest suites:
  - Rename or clone `agentCommandDryRun` → `runPlanMode` tests.
  - Update `agentCommandOptionalExec` to cover exec mode.
  - Ensure validation-related tests invoke the new entry point directly.
- [ ] Add new coverage for flag exclusivity and error messaging.
- [ ] Ensure snapshots (`instructionEmitter` etc.) remain valid.

### 6. CLI Help & UX
- [ ] Update CLI help output to describe new flags and modes succinctly.
- [ ] Optionally add `cda run --help` usage examples.
- [ ] Ensure `cda list` references `cda run --plan` for prompt inspection.

### 7. Release Preparation
- [ ] Bump version (likely 0.5.0) and update `CHANGELOG.md` with command changes and deprecation notes.
- [ ] Run full test suite (`npm test`).
- [ ] Stage and commit changes; ensure `history/IMPLEMENTATION_PLAN_CMD.md` captured for traceability.

## Risks & Mitigations
- **Flag interactions causing confusion**: Provide explicit error messages and documentation; add unit tests for invalid combos.
- **Regression in existing workflows**: Keep wrappers functional and covered by tests until removal in 0.6.0.
- **Scope creep with `--audit`**: Decide early whether to ship or punt; if deferred, leave placeholder flag disabled.

## Dependencies
- None external. Reuses existing constraint loader and instruction emitter modules.

## Exit Criteria
- `cda run` handles validation, plan, and exec modes with correct flags.
- Legacy commands delegate to `cda run` and emit deprecation notices.
- Documentation/docs updated; CHANGELOG records updates.
- Vitest suite green with coverage for new behavior.
