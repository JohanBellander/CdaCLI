# Implementation Plan: Optional Constraint Support

## Summary
Extend the CDA CLI to treat bundled constraints as optional based on configuration, allowing repositories to disable selected constraints while keeping deterministic instruction packages. Work spans loader logic, configuration schema, CLI behavior, documentation, and test coverage.

## Milestones

### Milestone 1: Loader & Configuration Foundations
- Update `constraintLoader` to parse new `optional` flag, defaulting to `false`, alongside existing `enabled` field.
- Introduce configuration schema extensions (`constraint_overrides`) and helper utilities to merge bundle defaults with repository overrides.
- Add unit tests covering:
  - Default behavior (no overrides → all constraints active).
  - Override enabling a bundled-disabled constraint.
  - Attempting to disable a mandatory (non-optional) constraint (expect failure).

### Milestone 2: Instruction Pipeline Integration
- Update `buildBatchInstructionPackage` and `buildSingleInstructionPackage` to operate only on `active` constraints.
- Modify `runValidateCommand` and `runAgentCommand` to respect active constraints, including error handling when none are active.
- Ensure `recommended_order`, report templates, and prompts reflect filtered constraint sets.
- Enhance logging to record when constraints are skipped because they are disabled.

### Milestone 3: CLI UX & Prompt Enhancements
- Extend `cda list` output with a `status` column (`active`, `optional-enabled`, `optional-disabled`).
- Guard `cda describe` and single-constraint validation/agent paths from referencing disabled constraints.
- Update `assemblePrompt` metadata to include `disabled_constraints: []` for transparency (non-legacy prompts only).
- Refresh CLI help text (`cda init --help`, `cda agent --help`, etc.) to mention configuration overrides.

### Milestone 4: Init Scaffolding & Documentation
- Modify `cda init` to emit `constraint_overrides` in `cda.config.json` (empty object by default).
- Update `buildCdaGuide` to annotate optional constraints and exclude disabled ones in generated guidance.
- Document optional constraint workflow in `CDA.md` template and top-level docs (`SPECIFICATION_NEW.md`, README).
- Add new spec (`SPECIFICATION_OPTIONAL.md`) reference where appropriate.

### Milestone 5: Testing & QA
- Expand Vitest snapshots for instruction packages and prompts to capture active/disabled behavior.
- Add CLI integration tests for:
  - `cda list` statuses.
  - `cda validate`/`cda agent` with all constraints disabled (expect error).
  - Optional constraint toggling scenarios.
- Create fixtures under `tests/fixtures` representing optional constraint configurations.
- Manual QA: run `cda init`, toggle overrides, and verify outputs on Windows and Unix shells.

### Milestone 6: Release Prep
- Update CHANGELOG with optional constraint support summary and configuration instructions.
- Bump version in `package.json`.
- Prepare release notes emphasizing backwards compatibility and steps to adopt optional constraints.

## Risks & Mitigations
- **Backward compatibility:** ensure defaults maintain current behavior (all constraints active). Mitigate with comprehensive tests.
- **Configuration complexity:** provide clear error messaging when users attempt unsupported overrides.
- **Documentation drift:** centralize optional constraint guidance in `CDA.md` and README, reference specification.

## Dependencies
- Existing constraint markdown already contains `enabled` fields; no content changes required initially.
- No third-party dependencies needed; relies on internal configuration handling utilities.

## Success Criteria
- `cda validate` and `cda agent` output exclude disabled optional constraints.
- CLI commands surface optional status consistently.
- Tests cover toggle scenarios, ensuring reliable behavior.
- Documentation instructs users on enabling/disabling optional constraints.
