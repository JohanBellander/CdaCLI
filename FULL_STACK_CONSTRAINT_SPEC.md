# Full-Stack Architectural Constraint Specifications

This document captures the net-new constraints we plan to add (or significantly enhance) to complement the core CDA bundle. It also records the existing constraints we will rely on or extend instead of duplicating coverage. Each net-new constraint is described independently so it can be translated into CDA markdown as needed.

## Leverage Existing Constraints
- **domain-no-imports-from-app-or-infra** and **app-no-imports-from-infra** already enforce the layered dependency direction. We will enhance them only if we decide to cover additional path classifications (for example, UI-specific checks).
- **domain-no-side-effects** keeps the domain pure. Any clock/randomness heuristics we need will be folded into this existing rule.
- **file-naming** and **folder-naming** provide baseline structural conventions; we can extend their allowed patterns rather than creating a new naming constraint.
- **max-file-lines** and **excessive-nesting** guard complexity. If we introduce cyclomatic complexity thresholds, we will implement them as enhancements to these constraints.

The rest of this document focuses on six constraints that are not currently represented in the core bundle.

---

## 1. Ports-and-Adapters Integrity
**ID:** `ports-and-adapters-integrity`

**Intent**  
Enforce explicit contracts: domain exposes interface-only ports; app depends solely on ports; infra adapters implement those ports.

**Scope**  
- `src/domain/ports/**`
- `src/app/**`
- `src/infra/adapters/**`

**Violations**  
- `domain/ports` exports classes or concrete implementations.  
- App modules importing concrete infra adapters instead of ports.  
- Infra adapters not `implements`/extending the associated port.  
- Ports not referenced by any adapter (orphan contracts).

**Detection Heuristics**  
- Enforce file content rules for `ports` directory (only interfaces/types).  
- Import graph check from app modules to ensure dependencies target `domain/ports`.  
- Type analysis ensuring adapter classes declare `implements` pointing at port symbols.

**Remediation**  
1. Extract interfaces into `domain/ports`.  
2. Update app layer imports to target port interfaces.  
3. Update adapters to implement the interfaces.  
4. Add verification tests linking app services to mocked ports and adapters to contract tests.

---

## 2. Centralized Configuration Access
**ID:** `central-config-entrypoint`

**Intent**  
All runtime configuration (env vars, secrets, feature flags) must flow through a single infra entrypoint to prevent scattered configuration logic.

**Scope**  
- Include: entire repo
- Special path: `src/infra/config/index.ts` (or agreed entrypoint)

**Violations**  
- Any module outside the config entrypoint reading from `process.env`, config files, or secret stores directly.  
- Multiple config entrypoints providing overlapping settings.

**Detection Heuristics**  
- Search for `process.env`, `dotenv`, config SDK usage outside approved file(s).  
- Flag new config modules not re-exporting from the canonical entrypoint.

**Remediation**  
1. Move configuration reads to the canonical module.  
2. Expose typed getters/factories from the config module.  
3. Update callers to consume the exported config contract.  
4. Add tests ensuring config defaults and validation live in the entrypoint only.

---

## 3. UI Isolation from Services
**ID:** `ui-isolation`

**Intent**  
Ensure UI components interact through presenters/view-models/stores and avoid direct service or HTTP/database access.

**Scope**  
- Include: `src/ui/**`
- Additional directories for presenters/view-models: `src/app/presenters/**`, `src/app/view-models/**`, `src/ui/state/**`

**Violations**  
- UI components importing `src/domain/**` or `src/infra/**` modules.  
- Direct `fetch`/axios/GraphQL client calls in components.  
- Business logic branching without delegating to presenter/view-model.

**Detection Heuristics**  
- Import analysis to confirm components depend only on allowed modules.  
- AST search for `fetch`, `axios`, `graphql` usage in UI directories.  
- Optional pattern detection for large components lacking presenter usage.

**Remediation**  
1. Move business logic and IO orchestration into presenters or application services.  
2. Inject presenter/view-model via hooks or props.  
3. Add tests verifying component interactions with the presenter contract.

---

## 4. API Boundary Hygiene
**ID:** `api-boundary-hygiene`

**Intent**  
Keep transport-specific DTOs separate from domain models and ensure controllers map requests/responses via application services.

**Scope**  
- Include: `src/app/controllers/**`, `src/app/http/**`, `src/domain/**`

**Violations**  
- Controllers returning domain entities directly.  
- Controllers reaching into `infra` persistence models.  
- Missing mapping layer between DTOs and domain commands/events.

**Detection Heuristics**  
- Check controller return types for domain classes.  
- Detect direct imports from persistence layer in controllers.  
- Enforce presence of mapper modules or transformation functions.

**Remediation**  
1. Introduce DTO <-> Domain mappers.  
2. Route requests through application services that coordinate domain operations.  
3. Update controllers to use DTOs exclusively and add contract tests.

---

## 5. Observability Discipline
**ID:** `observability-discipline`

**Intent**  
Guarantee consistent logging and metrics by routing all signals through shared adapters; prevents ad-hoc telemetry.

**Scope**  
- Whole stack, with approved modules like `src/infra/telemetry/logger.ts`, `src/infra/telemetry/metrics.ts`.

**Violations**  
- Direct `console.log`, third-party logger instantiations, or metrics client usage outside telemetry adapters.  
- Missing structured context (correlation IDs, user/session) in logged events.

**Detection Heuristics**  
- AST search for disallowed logging calls.  
- Detect telemetry client constructors outside adapters.  
- Optional: ensure log invocations include required structured fields.

**Remediation**  
1. Replace direct logging with telemetry adapter calls.  
2. Centralize metrics emission in shared wrappers.  
3. Add automated checks for required context fields.  
4. Document telemetry usage patterns for developers.

---

## 6. Test Coverage Contracts
**ID:** `test-coverage-contracts`

**Intent**  
Tie architecture to testing discipline: every critical module must have a matching test of the appropriate type.

**Scope**  
- Domain services/value objects -> unit tests (`tests/domain/**`).  
- Application services/controllers -> integration/contract tests (`tests/app/**`).  
- Infra adapters -> adapter integration tests (`tests/infra/**`).  
- UI components -> render/interactions tests (`tests/ui/**`).

**Violations**  
- Missing test files for corresponding production modules.  
- Tests importing real infra adapters instead of test doubles.  
- UI components without interaction/assertion coverage.

**Detection Heuristics**  
- Mirror production directories to test directories; flag missing counterparts.  
- Validate test imports to ensure correct isolation level.  
- Measure coverage thresholds for critical directories.

**Remediation**  
1. Add missing tests with appropriate isolation level.  
2. Refactor code to be testable (e.g., inject dependencies).  
3. Automate coverage checks and update CI gates.

---

These specifications can be converted into CDA constraint markdown by supplying the HEADER, PURPOSE, SCOPE, VALIDATION, and other required sections using the details above.
