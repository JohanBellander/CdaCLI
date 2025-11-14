# `cda config` Command Specification

## 1. Purpose & Scope
- Introduce an interactive configuration command, `cda config`, that lets users enable or disable optional constraints via a terminal-based "CLI UX" using arrow keys and simple key bindings.
- Provide a first-class, discoverable workflow for editing `constraint_overrides` in `cda.config.json` without manual JSON editing.
- Ensure the command integrates cleanly with the existing constraint model (`enabled`, `optional`, `constraint_overrides`) and respects all current validation rules.

## 2. Goals
- Allow users to:
  - View all bundled constraints along with their optional/mandatory status.
  - See the current effective activation state (active vs disabled) for the current project.
  - Toggle the `enabled` state of optional constraints using an interactive, keyboard-driven UI.
  - Persist changes back into `cda.config.json` in a deterministic, minimal way.
- Keep the behavior consistent with `SPECIFICATION_OPTIONAL.md` and configuration rules:
  - Mandatory constraints cannot be disabled.
  - Optional constraints can be enabled or disabled per repository.
- Make it easy to understand which constraints affect `cda run` / `cda validate` / `cda agent` without needing to read raw JSON.

## 3. Non-Goals
- Changing the underlying constraint metadata model or instruction package structure.
- Introducing runtime-only overrides (all changes go through `cda.config.json`).
- Editing any other configuration fields (agents, paths, etc.)—`cda config` focuses solely on constraint activation.
- Providing a full-screen TUI framework; the UI can be a simple list/checkbox interaction.

## 4. Command Overview
- New top-level command: `cda config`.
- Primary mode: interactive TUI using arrow keys and simple key bindings.
- Optional flags (future extensibility, not necessarily all implemented in the first version):
  - `--no-interactive`: refuse to enter interactive mode (useful in CI) and print a guidance message.
  - `--enable <id>` / `--disable <id>`: non-interactive toggling for scripting (optional).

### 4.1 Invocation
- `cda config` (no flags):
  - Loads the current project configuration (from the working directory).
  - Loads bundled constraints with current overrides applied.
  - Starts the interactive UI if `stdout` is a TTY.
- `cda config --help`:
  - Prints usage, key bindings, and notes about optional vs mandatory constraints.

### 4.2 Environment & Pre-Conditions
- Must be run from a directory that either:
  - Contains a `cda.config.json` created by `cda init`, or
  - Produces a `CONFIG_ERROR` explaining that `cda init` must be run first.
- Requires a TTY for interactive mode:
  - If `process.stdout.isTTY === false`, exit with `CONFIG_ERROR` and guidance to either enable a TTY or use non-interactive flags (if implemented).

## 5. Data Model & Behavior

### 5.1 Inputs
- `cda.config.json` (current working directory):
  - Read using existing `projectConfig` loader.
  - Must conform to the existing schema with optional `constraint_overrides`.
- Bundled constraints (`src/constraints/core/**`):
  - Loaded via `loadConstraints({ constraintOverrides })`.
  - Each `ConstraintDocument` provides:
    - `meta.id`, `meta.name`, `meta.category`, `meta.optional`, `meta.enabled`, `meta.isActive`.

### 5.2 Effective State Calculation
For each constraint:
- `bundleEnabled`: the `enabled` flag from the markdown bundle.
- `optional`: the `optional` flag from the markdown bundle.
- `overrideEnabled`: value from `constraint_overrides[<id>].enabled` if present.
- `isActive`: current effective activation used by the rest of the system, as already computed by `constraintLoader`.

The UI presents:
- **Status**:
  - `mandatory` (not optional, effective active),
  - `mandatory-disabled` (bundle `enabled: false`, but not optional),
  - `optional-enabled`,
  - `optional-disabled`.
- **Toggleability**:
  - Only `optional` constraints can be toggled.
  - Mandatory constraints should be visually distinct and non-selectable for toggling.

### 5.3 Output & Persistence
- On successful completion (user chooses to save changes):
  - `cda config` writes an updated `cda.config.json`.
  - Only `constraint_overrides` is updated; other fields remain unchanged.
  - For each constraint:
    - If the user has changed the effective activation state relative to the bundle default:
      - `constraint_overrides[<id>] = { "enabled": <bool> }`.
    - If the user has reverted a constraint to its bundle default and an override exists:
      - Remove the entry from `constraint_overrides`.
- If the user cancels or quits without saving:
  - No changes are written to disk.

## 6. Interactive UX Design

### 6.1 Layout
A simple, scrollable list view:
- Header:
  - Current project path.
  - Short help line: `↑/↓: move  Space: toggle  Enter: save  Esc: cancel`.
- List rows (one per constraint):
  - Checkbox-style marker or status glyph:
    - `[x]` → active.
    - `[ ]` → disabled.
  - Constraint ID and short name.
  - Optional marker, e.g., `(optional)`.
  - Category (optional, for context).
- Footer:
  - Summary counts: `Active: N  Disabled: M (optional only)`.

### 6.2 Navigation & Key Bindings
- `↑` / `↓`: move selection up/down.
- `PageUp` / `PageDown`: scroll by multiple rows (optional).
- `Home` / `End`: jump to first/last item (optional).
- `Space` or `Enter` on a list item:
  - Toggle `enabled` for optional constraints.
  - No effect (or brief warning) if attempting to toggle a mandatory constraint.
- `s` or `Ctrl+S`:
  - Save and exit (equivalent to confirming changes).
- `Esc` or `q`:
  - Cancel and exit without writing changes.

### 6.3 Visual Distinctions
- Mandatory constraints:
  - Rendered with a different label, e.g., `[!]` or a `mandatory` tag.
  - Grayed out or otherwise visually distinct if disabled by bundle but non-optional.
- Optional constraints:
  - Clear `(optional)` indicator.
  - Toggling feedback (e.g., brief status line "Toggled: <id> → disabled").

## 7. Error Handling & Edge Cases
- **Missing config file**:
  - Emit `CONFIG_ERROR`: `cda.config.json not found. Run 'cda init' first.`
- **Malformed config**:
  - Rely on existing config loader to raise a `CONFIG_ERROR` with details.
- **Unknown constraint IDs in overrides**:
  - Rely on existing `constraintLoader` behavior, which already throws when `constraint_overrides` reference unknown constraints.
- **All constraints disabled**:
  - The UI may allow this, but on save:
    - Option A (preferred): allow saving, but remind the user that `cda run` / `cda validate` will fail with `No active constraints available.`
    - Option B: prevent saving and surface a clear error.
- **Non-TTY environment**:
  - Exit early with a clear error message explaining that interactive mode requires a TTY.
  - Optionally suggest using future non-interactive flags.

## 8. CLI Integration & Compatibility
- Update CLI dispatch in `src/cli/index.ts` to add a `config` command handler.
- Ensure help output includes the new command:
  - `config     Configure which constraints are active (interactive)`.
- `cda list`, `cda describe`, `cda run`, `cda validate`, and `cda agent` remain unchanged in their core behavior; they simply observe the updated `constraint_overrides`.

## 9. Testing Strategy (High-Level)
- Unit tests for the config command’s pure logic:
  - Mapping between bundle metadata + overrides → effective state model used by the UI.
  - Conversion from diffed UI state → `constraint_overrides` object.
- Integration tests:
  - `cda config` on a project with mixed mandatory/optional constraints, using a TTY test harness or simulated input.
  - Verify that saved overrides affect `cda list` and `cda validate` as expected.
- Edge cases:
  - No optional constraints available (command should still render a read-only view and explain that nothing can be toggled).
  - Existing overrides that disable multiple constraints.

## 10. Open Questions
- Which Node TUI library to adopt (e.g., checkbox-style prompt vs full-screen layout) that is compatible with ESM and the `pkg` bundling used for `dist-exe/cda.exe`.
- Whether to support non-interactive flags (`--enable` / `--disable`) in the first iteration or defer them.
- Whether to group constraints by category in the UI or present a flat list with a filter.
- How strict the command should be about preventing "no active constraints" vs allowing it and relying on downstream commands to error.
