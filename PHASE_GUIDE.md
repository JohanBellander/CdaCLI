# Phase-Gated Implementation Guide

This document expands the `--phase` workflow introduced in `SPEC_PHASES.md`. Each section covers the goal of a phase, the recommended command sequence, expected artifacts, and common pitfalls. Follow these steps in order—later phases assume earlier layers are already implemented and validated.

## How to Use This Guide
1. Run `cda agent --phase <name> --dry-run` before touching code. Archive the prompt and study the phase objective, architectural context, and next-step hints.
2. Implement only the artifacts listed for the current phase. Avoid pulling future-phase concerns inward (e.g., don't build UI before the domain layer passes validation).
3. Run `npm run build` followed by `cda run --phase <name> --exec`. Fix violations immediately. Do **not** skip ahead if the current phase has open issues.
4. Use this guide as a checklist alongside `CDA.md`. Each phase below links the CLI commands to concrete deliverables and troubleshooting advice.

## Phase 1: Foundation (Config, Logging, Structure)
### Purpose
Establish observability, configuration, and structural guardrails before domain logic. Lock naming conventions and directory depth to avoid expensive refactors.

### Command Flow
1. `npm install`
2. `npm run build`
3. `cda agent --phase foundation --dry-run`
4. Implement config entrypoint, logger, and folder/file structure.
5. `npm run build`
6. `cda run --phase foundation --exec`

### Expected Artifacts
- `src/config/index.ts` (single source of configuration truth).
- Shared logger/telemetry utilities under `src/lib/logger.ts` or equivalent.
- Baseline folder structure (`src/domain`, `src/application`, `src/infrastructure`, `src/presentation`).
- Files/folders in kebab-case, shallow directory depth (<5 levels), files under 500 LOC.

### Common Mistakes
- Creating ad-hoc config files outside the central entrypoint.
- Skipping logging setup until later phases (violates observability-discipline).
- Ignoring naming rules or deep directory trees to "clean up later."

### Troubleshooting
- If a constraint is disabled in this phase, re-enable it in `cda.config.json` or document the intentional override.
- If `cda run --phase foundation --exec` fails, fix those violations before touching domain code—later phases depend on this foundation.

## Phase 2: Domain Layer (Pure Business Logic)
### Purpose
Model business entities, value objects, and Zod contracts without side effects or framework dependencies.

### Command Flow
1. `cda agent --phase domain --dry-run`
2. Implement domain modules (pure functions, aggregates, shared types).
3. `npm run build`
4. `cda run --phase domain --exec`

### Expected Artifacts
- `src/domain/<entity>` modules exporting pure functions/classes.
- Shared schemas (e.g., `src/domain/schemas` or `packages/shared-types`) backed by Zod.
- Domain ports/interfaces that describe required infrastructure behavior.

### Common Mistakes
- Importing `fs`, HTTP clients, or database libraries inside domain code.
- Generating TypeScript types manually instead of inferring from Zod schemas.
- Allowing the domain to import from `src/application` or `src/infrastructure`.

### Troubleshooting
- If violations reference missing Zod schemas, consolidate shared contracts under `packages/shared-types` and re-export inferred types.
- For side effects sneaking into the domain, extract them into ports and enforce purity via tests before re-running the phase.

## Phase 3: Infrastructure Layer (Ports & Adapters)
### Purpose
Build adapters that connect the pure domain to external systems (databases, HTTP APIs, file systems) using the ports defined earlier.

### Command Flow
1. `cda agent --phase infrastructure --dry-run`
2. Implement repositories, HTTP clients, and adapter wiring around domain ports.
3. `npm run build`
4. `cda run --phase infrastructure --exec`

### Expected Artifacts
- Repositories under `src/infrastructure/persistence/**/*` (Prisma or equivalent).
- HTTP clients under `src/infrastructure/http-clients/**/*` (wrapping Axios/fetch).
- Adapter implementations living in `src/infrastructure/adapters/**/*` that import domain ports.

### Common Mistakes
- Calling domain implementations from infrastructure (should depend on ports only).
- Skipping API boundary validation (`api-boundary-hygiene`) or leaking raw Axios calls into UI layers.
- Forgetting to keep clean dependency direction (infra depends on domain, never the reverse).

### Troubleshooting
- If Prisma or HTTP constraints are disabled, update `cda.config.json` overrides or document why those adapters are not needed.
- Failing `clean-layer-direction` usually means infrastructure imports domain modules that themselves import infrastructure. Split the logic into ports/adapters to break the cycle.

## Phase 4: Application Layer (Use Cases & Tests)
### Purpose
Orchestrate domain workflows, enforce MVC/MVP/MVVM boundaries, and add regression tests that prove behavior at the use-case level.

### Command Flow
1. `cda agent --phase application --dry-run`
2. Implement application services/use cases plus contract tests.
3. `npm run build`
4. `cda run --phase application --exec`

### Expected Artifacts
- Use-case modules under `src/application/use-cases` or feature directories (`src/features/<name>/usecases`).
- Controllers/presenters/view-models that depend on ports, not infrastructure implementations.
- Test suites achieving ≥80% coverage for orchestrations and behavior contracts.

### Common Mistakes
- Leaving MVC/MVP/MVVM constraints disabled when the UI stack requires them.
- Importing repositories or HTTP clients directly inside use cases (violates `app-no-imports-from-infra`).
- Treating tests as optional—`test-coverage-contracts` enforces explicit coverage.

### Troubleshooting
- Enable pattern constraints (`mvc-layer-separation`, `mvp-presenter-boundaries`, `mvvm-binding-integrity`) via overrides if the architecture needs them.
- When tests fail to meet coverage, add behavioral tests around use cases rather than the UI/infra layers.

## Phase 5: Presentation Layer (Fastify, Next.js, React)
### Purpose
Expose the system through HTTP controllers, Next.js App Router, and React components backed by TanStack Query.

### Command Flow
1. `cda agent --phase presentation --dry-run`
2. Implement Fastify routes, Next.js pages/layouts, and React components.
3. `npm run build`
4. `cda run --phase presentation --exec`

### Expected Artifacts
- Fastify bootstrap + route handlers under `src/presentation` or `apps/api`.
- Next.js App Router layouts/pages/components under `apps/web` (App Router conventions).
- React components built as pure UI, consuming TanStack Query hooks instead of raw Axios calls.

### Common Mistakes
- Writing React components that perform side effects (fetch, mutate state) outside TanStack Query hooks.
- Bypassing Fastify server structure with ad-hoc HTTP scripts.
- Violating App Router conventions (`app/<route>/page.tsx`, layout boundaries, etc.).

### Troubleshooting
- If TanStack Query isn’t available, wire it up before attempting this phase—React constraints expect the async data layer to be in place.
- When Fastify controllers import infrastructure directly, refactor them to call application use cases instead.

## When to Revert to the Legacy Workflow
- Maintenance work on a mature codebase (bug fixes, small refactors) can run `cda agent --dry-run` / `cda run --exec` without `--phase`.
- Audits that focus on a single constraint can use `--constraint <id>` instead of the phased approach.
- Greenfield projects and major rewrites must follow the five-phase sequence to stay aligned with the layered architecture.

## Troubleshooting Checklist
- **Phase command fails immediately**: ensure `--phase` isn’t combined with `--constraint`/`--sequential`, and verify the phase name is one of `foundation | domain | infrastructure | application | presentation`.
- **Warning: disabled constraints**: check `cda.config.json`—either re-enable the constraint or document why the phase is intentionally skipping it.
- **Warning: missing constraints**: confirm the repository includes all bundled constraint markdown files. Missing files indicate an incomplete installation.
- **Empty phase error**: a phase where every mapped constraint is disabled can’t be validated. Enable at least one rule before progressing.
- **Prompt exceeds agent limits**: switch to a stdin-mode agent (`copilot-stdin`) or reduce the scope temporarily by focusing on a single constraint (`--constraint <id>`). Prompt metadata still records the cumulative constraint count for auditing.

Stay disciplined: run the commands in order, capture evidence in your transcript after each run, and do not begin the next phase until the current phase passes `cda run --phase <name> --exec`.
