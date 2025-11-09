# Specification: Fully Optional Constraints

## 1. Objective
Allow any bundled constraint to be disabled via configuration without raising mandatory-constraint errors. Users must be able to run `cda validate`/`cda agent` with zero constraints active (receiving the existing "No active constraints" error) and selectively re-enable constraints as desired.

## 2. Scope
- Configuration parsing and constraint metadata merging.
- Instruction assembly, prompt generation, and CLI UX.
- Documentation (README, specs, generated CDA.md) and sample configs.
- Automated tests and fixtures covering the new behavior.

Out of scope: runtime flags, remote constraint packs, environment-driven toggles.

## 3. Functional Requirements
1. **Constraint Activation Logic**
   - Eliminate the mandatory/optional distinction. The bundle `enabled` value represents the default state only.
   - `constraint_overrides.<id>.enabled` may be `true` or `false` for any constraint.
   - During load, compute `isEnabled = override ?? bundleEnabled` with no guardrails.

2. **CLI Behavior**
   - `cda list` status column displays `active` or `disabled`. No `optional-*` states.
   - Attempting to target a disabled constraint (`cda describe`, `cda validate --constraint`, `cda agent --constraint`) yields `CONFIG_ERROR: Constraint '<id>' is disabled.`
   - Dry-run logs record `Constraint '<id>' disabled via configuration.` when skipping.
   - When all constraints disabled, continue to throw `CONFIG_ERROR: No active constraints available.`

3. **Instruction & Prompt Changes**
   - Batch and single packages only include enabled constraints (existing filter).
   - Prompt metadata (non-legacy) lists disabled constraints in `disabled_constraints: []` as today.

4. **Documentation & Scaffolding**
   - Update README, `SPECIFICATION_NEW.md`, `SPECIFICATION_OPTIONAL.md`, `CDA.md` generator output.
   - Regenerate or patch `cda init` templates so example configs show fully optional behavior without warnings.

5. **Testing**
   - Adjust unit/integration tests removing mandatory guard assertions.
   - Add coverage toggling previously mandatory constraints (e.g., `max-file-lines`).
   - Update fixtures to include configurations with all constraints disabled and per-constraint toggles.

6. **Release Notes**
   - Document the change in `CHANGELOG.md` with guidance to review project `constraint_overrides`.
   - Bump package version.

## 4. Risks & Mitigations
- **Accidental blanket disabling:** mitigate with documentation emphasizing review of overrides.
- **Automation relying on status strings:** call out the status column change in release notes.

## 5. Success Criteria
- `cda agent` / `cda validate` run successfully when any combination of constraints is disabled.
- Users no longer see "mandatory" error messaging.
- Updated tests and docs pass review.
- Release artifacts highlight the behavior change.
