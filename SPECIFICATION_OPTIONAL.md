# CDA CLI Optional Constraint Support

## 1. Purpose & Scope
- Introduce first-class support for enabling or disabling individual bundled constraints without removing the files.
- Allow downstream projects to ship with optional constraints that can be toggled per repository via configuration.
- Preserve deterministic instruction packages by making constraint activation explicit and traceable.

## 2. Goals
- Provide a configuration-driven mechanism to mark bundled constraints as optional.
- Ensure instruction packages (`cda validate`, `cda agent`) only include constraints that evaluate as enabled for the active configuration.
- Surface the optional/enabled state through CLI UX (`cda list`, `cda describe`) so users understand which constraints apply.
- Maintain backwards compatibility for repositories that do not opt into optional constraints (all constraints stay enabled by default).

## 3. Non-Goals
- Runtime toggling via CLI flags (configuration is the only control surface).
- Partial evaluation of a single constraint (constraint text remains static).
- Remote fetching or conditional enforcement based on environment variables.

## 4. Constraint Metadata Model
- Retain the existing frontmatter `enabled: boolean` field in bundled markdown files.
- Introduce an optional `optional: boolean` flag (default `false`).
  - `false` → constraint is mandatory; configuration cannot disable it.
  - `true` → constraint may be disabled via configuration.
- `constraintLoader` continues to parse `enabled` and `optional`, defaulting to `enabled: true`, `optional: false` when fields are missing.
- When `enabled: false` appears in the bundle, the constraint is treated as disabled by default but can still be re-enabled through configuration overrides.

## 5. Configuration Extensions (`cda.config.json`)
- Add an optional `constraints_overrides` object:
```json
{
  "version": 1,
  "constraints": "builtin",
  "constraint_overrides": {
    "constraint_id": {
      "enabled": true | false
    }
  }
}
```
- Rules:
  - Overrides must reference existing constraint IDs.
  - Overrides may only disable constraints marked `optional: true`.
  - Overrides may re-enable bundled constraints that ship with `enabled: false`.
  - A constraint is considered enabled when `meta.enabled` (bundle default) merged with override resolves to `true`.
- `loadAgentConfig` unaffected; this data feeds instruction selection only.

## 6. Instruction Package Changes
- `buildBatchInstructionPackage` filters the input constraint list to `doc.meta.isActive === true`.
- `buildSingleInstructionPackage` rejects requests for disabled constraints with a `CONFIG_ERROR` (message: `Constraint '<id>' is disabled by configuration.`).
- `recommended_order` contains only active constraints.
- Report templates continue to reference the count of included constraints; no schema changes required.

## 7. CLI Behavior
- `cda list` outputs an additional `status` column:
  - `active` (mandatory and enabled),
  - `optional-enabled`,
  - `optional-disabled`.
- `cda describe <id>` refuses disabled optional constraints with the same error text as single-package generation.
- `cda validate` and `cda agent` respect the active set; when the last constraint is disabled, the commands raise `CONFIG_ERROR` (`No active constraints available.`).
- Help text (`cda init --help`, `cda agent --help`, etc.) references the configuration override approach in a short note.

## 8. Initialization Flow (`cda init`)
- Generated `cda.config.json` includes an empty `constraint_overrides` object with a comment in `CDA.md` instructing users how to toggle optional constraints.
- When scaffolding `CDA.md`, optional constraints should be marked in the summary table (e.g., `Intent (Optional)` tag) and excluded from the playbook when disabled.

## 9. Telemetry & Logging
- When a constraint is skipped because it is disabled, log `Constraint '<id>' skipped (disabled by configuration).` to stdout for `--dry-run` modes and stderr otherwise.
- Include the list of disabled constraints in the prompt metadata block appended by `assemblePrompt` (new line: `disabled_constraints: [<ids>]`).

## 10. Testing Strategy
- Unit tests for `constraintLoader` verifying defaulting, override merging, and mandatory guardrails.
- Snapshot updates for `instructionEmitter` to confirm filtered constraint lists and report counts.
- CLI integration tests covering:
  - `cda list` status column.
  - `cda validate` error when no constraints active.
  - `cda agent` prompt metadata for disabled sets.
- Fixtures added under `tests/fixtures/constraints-optional` with various combinations.

## 11. Backwards Compatibility
- Repositories without `constraint_overrides` continue to see all constraints active.
- `cda list` status column defaults to `active` for legacy installs; scripts parsing output by column index need to adjust, but column headers remain deterministic.
- Legacy format (`--legacy-format`) does not surface disabled constraints list to avoid breaking existing consumers.

## 12. Rollout Plan
1. Implement loader + configuration merge logic.
2. Update instruction pipeline and CLI commands.
3. Refresh generated documentation (`CDA.md` templates) and help text.
4. Expand Vitest coverage and snapshots.
5. Tag release notes highlighting optional constraint support and configuration snippet.

## 13. Open Questions
- Should optional constraints participate in enforcement order numbering even when disabled? (Current assumption: order remains fixed; disabled constraints simply absent from lists.)
- Do we allow per-run overrides via environment variables for CI experimentation? (Out of scope for now.)
- Should `cda init` prompt the user to opt into recommended optional constraints interactively? (Deferred.)
