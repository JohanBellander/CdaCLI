# Existing Constraint Enhancement Backlog

This document scopes refinements for the four core guardrail groups called out in `FULL_STACK_CONSTRAINT_SPEC.md`: domain purity, layer import rules, naming, and complexity. Use it to seed future beads (per constraint) once capacity opens.

## 1. domain-no-side-effects
- **Add timezone awareness:** flag `Intl.DateTimeFormat`, `moment`, or other clock abstractions unless injected via parameters.
- **Randomness allowlists:** support `@cda/clock` and `@cda/id` helper modules so teams can centralize randomness instead of sprinkling overrides.
- **Persistence guard:** detect `new PrismaClient()` or ORM entity imports that slip into domain modules through barrels.
- **Environment extraction:** surface a single fix-it hint instructing teams to create a `ClockPort`/`RandomPort` so remediation instructions stay consistent.

## 2. domain-no-imports-from-app-or-infra / app-no-imports-from-infra
- **Expanded path classifier:** support additional UI/App aliases such as `apps/`, `packages/app/`, or Nx-style workspace names by reading `tsconfig.json` `paths`.
- **Adapter exceptions:** allow app services to import infra adapters only from `src/infra/adapters/<feature>/__contracts__` when a bead marks the exception (necessitates override metadata in `cda.config.json`).
- **Cycle detector:** unify with `clean-layer-direction` to de-duplicate reporting; core constraint should emit the short list of forbidden edges while the full-stack rule explains cross-layer context.
- **Positive reporting:** include the resolved layer in success logs so adopters can confirm ambiguous directories are interpreted correctly.

## 3. file-naming / folder-naming
- **Feature slug alignment:** mirror the `structural-naming-consistency` logic so core naming constraints catch drift even when the full-stack bundle is disabled.
- **Per-layer patterns:** expose config hook (`naming_overrides`?) allowing UI vs. Domain to use different suffixes (e.g., `.component.tsx` vs `.service.ts`).
- **Generated asset ignore list:** automatically ignore `*.generated.ts`, `.d.ts`, `schema.prisma`, etc., to reduce false positives.
- **Reporting upgrades:** include `expected_example` in the violation payload to make remediation faster.

## 4. max-file-lines / excessive-nesting
- **Function-level thresholds:** surface the most complex function (name + metrics) so agents can target the hottest spot instead of the whole file.
- **Test-aware leniency:** allow higher thresholds for `*.test.*` files with an opt-in multiplier (`tests_complexity_multiplier: 1.5`).
- **Composable exclusions:** let repos define `complexity_ignore` globs in `cda.config.json` for generated migrations or config files.
- **Auto-splitting guidance:** add remediation tips referencing the new module decomposition playbooks (extract strategy object, view-model, etc.).

## Next Steps
1. Convert each bullet list into its own bead (type `task` or `feature`) with `discovered-from:CDATool-shg.11`.
2. Prototype heuristics under a feature flag where possible (`constraint_overrides` entry or metadata block).
3. Update `README`, `CDA.md`, and constraint markdowns when an enhancement graduates to GA.

Track edits to this file under source control so downstream contributors can propose additional scope items before they become beads.
