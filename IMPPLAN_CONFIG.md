# Implementation Plan: `cda config` Command

## Phase 1 – Design Alignment
- Review `SPEC_CONFIG.md`, `SPECIFICATION_OPTIONAL.md`, and `SPECIFICATION_NEW.md` to ensure the command’s behavior matches the existing constraint model and optional-constraint semantics.
- Confirm project config shape and helpers in `src/core/projectConfig.ts` (or equivalent) for loading and persisting `cda.config.json`.
- Decide on handling for "no active constraints" (allow vs prevent) and document the chosen behavior in the spec if needed.

## Phase 2 – Core Wiring & Data Flow
- Add a `config` entry in `src/cli/index.ts` dispatch map and help text, delegating to a new `runConfigCommand(args: string[])` function.
- Implement `runConfigCommand` in `src/cli/commands/config.ts`:
  - Load `cda.config.json` using existing config loader.
  - Load bundled constraints via `loadConstraints({ constraintOverrides })`.
  - Build an internal view-model for the UI (constraint id, name, category, optional flag, bundle default, current effective state, and toggleability).
- Implement pure helper functions in a separate module (e.g., `src/core/configConstraintState.ts`) for:
  - Mapping bundle metadata + overrides → UI state model.
  - Computing overrides diff from UI state → `constraint_overrides` object.

## Phase 3 – Interactive UI Layer
- Select a Node TUI library compatible with ESM and `pkg` (e.g., a checkbox-style prompt library) and add it as a dependency in `package.json`.
- Implement the interactive flow in `runConfigCommand`:
  - Check `process.stdout.isTTY`; if false, emit a `CONFIG_ERROR` with guidance.
  - Invoke the TUI with the prepared list of constraints, mapping key bindings as described in `SPEC_CONFIG.md` (arrow keys to navigate, space/enter to toggle, save/cancel keys).
  - Ensure mandatory constraints are rendered as non-toggleable and visually distinct.
- Handle the result from the UI:
  - If the user cancels, exit without changes.
  - If the user confirms, compute the updated `constraint_overrides` using the pure helper functions.

## Phase 4 – Persistence & Integration
- Update `cda.config.json` persistence logic:
  - Merge the updated `constraint_overrides` into the loaded config object.
  - Remove overrides that match the bundle default to keep the file minimal.
  - Serialize and write the updated config file atomically (write to temp file, then rename, if needed).
- Ensure existing commands (`list`, `describe`, `run`, `validate`, `agent`) automatically pick up the new overrides without additional changes.
- Update CLI help output to include a one-line description for `cda config`.

## Phase 5 – Testing
- Add unit tests for the pure helper module (e.g., `configConstraintState`) covering:
  - State mapping for mandatory vs optional constraints.
  - Override calculation when toggling optional constraints on/off and reverting to defaults.
- Add CLI-level tests (Vitest) for `runConfigCommand` in non-interactive scenarios:
  - Missing `cda.config.json` → `CONFIG_ERROR`.
  - Malformed config or unknown constraint in overrides → surfacing existing error behavior.
  - Non-TTY environment → clear error message and exit.
- Where feasible, add a minimal TTY simulation or library-specific test harness to verify key aspects of the interactive flow (e.g., toggling and save vs cancel behavior) without relying on full end-to-end terminal emulation.

## Phase 6 – Documentation & Rollout
- Update `README.md` and any onboarding docs to mention `cda config`, including a brief example of toggling optional constraints.
- Add a short note to `CDA.md` generation (if appropriate) referencing `cda config` as the recommended way to manage optional constraints.
- Include the new command in release notes, highlighting that it is the preferred way to edit `constraint_overrides` instead of manual JSON editing.
- Monitor usage and feedback; plan follow-up enhancements (e.g., grouping by category, filters, non-interactive flags) based on real-world usage.
