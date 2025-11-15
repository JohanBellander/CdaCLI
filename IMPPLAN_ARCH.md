# Implementation Plan: Architecture-Aligned Constraints (`IMPPLAN_ARCH.md`)

This plan describes how to implement the specification in `SPEC_ARCH.md` in small, verifiable steps.

---

## Phase 1 – Introduce `group` Metadata

### Goal
Add a `group` field to all constraints so they can be organized and selected according to the new grouping model.

### Steps

1. **Extend constraint frontmatter schema (if needed)**
   - Confirm how constraint frontmatter is parsed (likely in `src/core/constraintLoader.ts` or related modules).
   - Ensure the loader tolerates a `group` field in frontmatter without breaking existing behavior.
   - No validation logic should assume a fixed set of fields; if it does, extend it to include `group`.

2. **Add `group` to new constraints first**
   - For any new constraints created during this work, always include a valid `group` value (`patterns`, `architecture`, `best-practices`, `frameworks`, or `contracts`).

3. **Gradually update existing constraint files**
   - For each markdown file under `src/constraints/core/`:
     - Add a `group` field in frontmatter according to `SPEC_ARCH.md` mapping:
       - Layering and module boundaries → `group: architecture`.
       - Hexagonal/MV* pattern rules → `group: patterns`.
       - Naming, complexity, observability, test coverage → `group: best-practices`.
       - Framework-specific rules (when added) → `group: frameworks`.
       - Contract and schema rules → `group: contracts`.
   - Keep changes minimal (only add `group`); do not alter existing IDs or semantics in this phase.

4. **Add minimal tests or checks**
   - If constraints are loaded into an in-memory representation, add or update a unit test that loads all constraint files and asserts:
     - Every constraint has a non-empty `id` and `name`.
     - Every constraint has a `group` field that is one of the allowed values.

### Exit Criteria

- All existing constraint markdown files have a `group` field.
- The codebase parses constraints successfully and tests pass.
- No behavior changes yet in CLI output beyond the metadata being available.

---

## Phase 2 – Implement Framework-Specific Constraints

### Goal
Introduce small, composable framework constraints that map to the architecture in `ARCHITECTURE.md`.

### Steps

1. **Create new constraint markdown files**
   - Under `src/constraints/core/`, add files for each new constraint:
     - `fastify-http-server`
     - `zod-contracts`
     - `prisma-data-access` (optional/opt-in)
     - `nextjs-app-structure`
     - `react-ui-only`
     - `tanstack-query-async`
     - `axios-client-only`
     - `shared-types-zod-source-of-truth`
   - For each file:
     - Define frontmatter with `id`, `name`, `category`, `severity`, `enabled`, `optional`, `version`, and `group` (`frameworks` or `contracts`, as per spec).
     - Write concise, focused rule text mirroring the intent and rules from `SPEC_ARCH.md`.

2. **Align rules with concrete repo paths and imports**
   - Ensure each constraint description references real paths and patterns from the architecture:
     - `apps/web`, `apps/api`, `packages/shared-types`.
     - Feature folders under `apps/*/src/features/`.
     - Shared libs like `apps/web/src/lib/apiClient.ts` and `apps/web/src/lib/queryClient.ts`.
   - Where possible, describe constraints in terms of import paths and file location patterns (e.g. "components under `apps/web/src/features/*/components` must not import `axios`").

3. **Set sensible defaults**
   - Decide default `enabled` and `optional` values:
     - Framework constraints may be `enabled: false`, `optional: true` by default so projects can opt in.
     - Alternatively, provide presets or profiles later; for now, just make them opt-in.

4. **Documentation cross-links**
   - Add short notes in each new constraint referencing `ARCHITECTURE.md` or `SPEC_ARCH.md` where helpful, to keep intent discoverable.

### Exit Criteria

- All new framework and contracts constraints are present as markdown files.
- They compile conceptually with the existing architecture (no references to non-existent paths or tools).
- They carry `group` metadata and can be toggled via `cda config` once Phase 3 is done.

---

## Phase 3 – Expose Groups in CLI UX (Optional but Recommended)

### Goal
Use the new `group` metadata to improve discoverability and selection of constraints in the CLI, especially `cda config`.

### Steps

1. **Update internal representations**
   - Where constraints are surfaced to the CLI (e.g. in `src/cli/commands/config.ts` and related helpers), include the `group` field in the data model.

2. **Group constraints in `cda config`**
   - Adjust the interactive `cda config` UI to:
     - Optionally show group labels.
     - Optionally group constraints by `group` in lists.
   - Keep changes minimal and backward compatible (e.g. do not remove existing modes; just add grouping as a visual structure or filter).

3. **Filtering and presets (optional)**
   - If desired, add options to:
     - Filter constraints by group (e.g. show only `frameworks`).
     - Apply a preset that enables a known stack (e.g. "ARCH" preset that turns on the recommended combination of architecture + frameworks + contracts constraints).

### Exit Criteria

- `cda config` can display constraints with group information.
- Users can understand which constraints are patterns, architecture rules, best practices, frameworks, or contracts.
- No regressions in existing `cda config` behavior or tests.

---

## Phase 4 – Reconcile Existing Constraints with React/Next/Fastify Stack

### Goal
Ensure older constraints (especially UI isolation and MV* ones) do not conflict with the React+hooks + Next.js + TanStack Query + Fastify architecture.

### Steps

1. **Review existing UI and pattern constraints**
   - Examine `ui-isolation`, `mvc-layer-separation`, `mvp-presenter-boundaries`, `mvvm-binding-integrity`, and similar rules.
   - Identify any language that assumes a specific UI architecture that conflicts with the React+hooks model.

2. **Refine or scope constraints**
   - Where necessary, adjust wording to:
     - Make the constraint compatible with React+hooks, **or**
     - Clearly mark it as optional and targeted at other styles (e.g. classic MVC/MVP apps).
   - Prefer scoping adjustments that mention why and when to use them so they can coexist with framework-specific constraints.

3. **Set default enablement**
   - Consider defaulting MV* constraints to `enabled: false`, `optional: true` in a React/Next context, while keeping them available for other projects.

4. **Update docs**
   - If there is a constraints overview or README section that lists constraints, update it to:
     - Reflect groupings.
     - Clarify how these more opinionated constraints relate to the `ARCHITECTURE.md` stack.

### Exit Criteria

- No obvious conflicts between existing constraints and the opinionated stack.
- MV* and UI isolation constraints still exist but are clearly framed and grouped.

---

## Phase 5 – Validation and Iteration

### Goal
Validate the new grouping and framework constraints in a real or sample project that uses the architecture, then iterate.

### Steps

1. **Set up a sample configuration**
   - In a sample project (inside this repo or a separate playground), create a `cda.config.json` that:
     - Enables the architecture and patterns constraints.
     - Enables the relevant frameworks constraints (`fastify-http-server`, `zod-contracts`, `nextjs-app-structure`, `react-ui-only`, `tanstack-query-async`, `axios-client-only`, `shared-types-zod-source-of-truth`, optionally `prisma-data-access`).

2. **Run CDA and inspect results**
   - Run the CLI (e.g. `cda validate` or equivalent) against the sample project.
   - Confirm that violations and guidance align with expectations from `ARCHITECTURE.md` and `SPEC_ARCH.md`.

3. **Adjust constraints based on feedback**
   - If certain constraints are too strict or too loose:
     - Refine their markdown descriptions.
     - If necessary, split them into smaller, more focused constraints.

4. **Stabilize defaults**
   - After initial feedback, decide:
     - Which constraints should be enabled by default for this repo.
     - Whether to define one or more named profiles that the CLI can suggest.

### Exit Criteria

- The architecture-aligned constraint set behaves well on a real or sample codebase.
- There is a clear path for future tweaks without breaking existing users.

---

## Risks and Mitigations

- **Risk:** Adding `group` to all constraints could break parsing if the loader is strict.
  - **Mitigation:** Update loader and add tests in Phase 1 before editing many files.

- **Risk:** Framework constraints might reference paths or patterns that drift from the actual architecture over time.
  - **Mitigation:** Keep `SPEC_ARCH.md` and `ARCHITECTURE.md` in sync; review them when making structural changes.

- **Risk:** MV* or UI isolation constraints may still conflict conceptually with the React stack.
  - **Mitigation:** Make such constraints optional and document in their text when they are appropriate.

- **Risk:** CLI UX changes might confuse existing users.
  - **Mitigation:** Make group-based views additive and backward compatible; do not remove existing options.

This implementation plan is intentionally high-level and incremental so that each phase can be executed, tested, and adjusted independently while moving toward full alignment with `SPEC_ARCH.md` and `ARCHITECTURE.md`. 
