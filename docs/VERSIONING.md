# Versioning & Maintenance

This repository ships two related but distinct version streams:

1. **CLI semantic version** (`package.json > version`) -- tracks executable/API changes.
2. **Constraint frontmatter versions** (`src/constraints/core/*.md > version`) -- track authoritative enforcement templates.

## When to bump the CLI version

- **Patch (0.1.x -> 0.1.(x+1))**: Bug fixes, documentation updates, or tooling changes that do not alter instruction schemas.
- **Minor (0.x.0 -> 0.(x+1).0)**: New CLI commands, additional output fields, or changes that impact instruction layout but remain backward compatible for automation.
- **Major (x.0.0 -> (x+1).0.0)**: Breaking changes in command behavior, schema contracts, or file locations. (The MVP currently stays in `0.y.z` pre-1.0 mode.)

## When to bump a constraint version

Update the `version` field inside a constraint's YAML frontmatter **whenever** any of the following change:

- `FORBIDDEN`, `ALLOWED`, or `DEFINITIONS`
- `REQUIRED DATA COLLECTION` or `VALIDATION ALGORITHM (PSEUDOCODE)`
- `REPORTING CONTRACT` (required keys or ordering rules)
- `FIX SEQUENCE (STRICT)` or `SUCCESS CRITERIA (MUST)`

Pure wording tweaks (typo fixes, clarifications) do **not** require a bump.

## Regeneration workflow

- After editing any constraint markdown or bumping its version, re-run `cda init` inside the target project to regenerate `CDA.md`.
- Commit both the updated markdown and the regenerated `CDA.md` to keep downstream agents in sync.
- If multiple constraints change, rerun `cda init` only once at the end--the generator is idempotent.

## Future enhancements

A dedicated `cda regenerate` command is planned to refresh `CDA.md` without touching `cda.config.json`. Until then, re-running `cda init` in a clean working tree is the supported approach (delete `cda.config.json` first if you truly need to rebootstrap).
