# Phase-Gated Validation Specification (`SPEC_PHASES.md`)

## 1. Purpose & Scope

This specification introduces a **phase-gated validation workflow** for autonomous agents implementing new CDA-compliant codebases. Instead of emitting one massive 43KB prompt containing all constraints simultaneously, the system breaks implementation into **5 sequential phases** aligned with architectural layering principles.

Each phase:
- Emits a focused prompt (5-8KB) containing only constraints relevant to that phase
- Requires implementation and validation before proceeding to the next phase
- Provides early feedback, preventing architectural drift and reducing total violations

This addresses critical problems identified in previous agent onboarding attempts:
- **Prompt overload**: 43KB prompts overwhelm agents (instructions consume 80% of context)
- **Late validation**: Agents implement everything before validation, making fixes costly
- **Guidance burial**: Important architectural guidance gets lost after 35KB of constraint details
- **All-or-nothing**: No intermediate checkpoints; agents either pass or face massive rework

## 2. Goals

- Reduce first-run violations from 24+ to <12 by providing focused, digestible guidance
- Enable incremental validation with early error detection at phase boundaries
- Align constraint presentation with natural implementation order (foundation → presentation)
- Keep each phase prompt under 10KB (vs current 43KB monolithic prompt)
- Maintain backward compatibility: non-phased workflow still available via existing commands
- Guide agents through a proven implementation sequence that minimizes architectural mistakes

## 3. Non-Goals

- Changing constraint content, structure, or validation algorithms
- Reordering existing `enforcement_order` values in constraint metadata
- Supporting arbitrary phase definitions (5 phases are fixed and canonical)
- Phase-level `constraint_overrides` (optional constraints still globally enabled/disabled)
- Automatic phase progression (agents must explicitly advance via command flags)
- Multi-phase parallel execution (phases are strictly sequential)

## 4. The Five Implementation Phases

### Phase 1: Foundation
**Purpose**: Establish observability, configuration, and cross-cutting concerns before any business logic.

**Constraints** (in enforcement order):
1. `central-config-entrypoint` – Single configuration source
2. `observability-discipline` – Logging/monitoring infrastructure
3. `structural-naming-consistency` – File/folder naming standards
4. `file-naming` – Kebab-case file conventions
5. `folder-naming` – Kebab-case folder conventions
6. `max-file-lines` – File size limits (500 LOC)
7. `excessive-nesting` – Directory depth limits (4 levels)

**Rationale**: Config and observability are prerequisites for all other layers. Structural conventions prevent refactoring later.

**Expected Artifacts**:
- `src/config/index.ts` (or equivalent config entrypoint)
- Logger utility in `src/lib/logger.ts`
- Basic folder structure: `src/domain/`, `src/application/`, `src/infrastructure/`, `src/presentation/`
- All files follow naming conventions

**Validation Scope**: Run validation with `--phase foundation` to check only Phase 1 constraints.

**Prompt Size Estimate**: ~6-7KB (7 constraints × ~800-1000 chars each)

---

### Phase 2: Domain Layer
**Purpose**: Implement pure business logic with no side effects, framework imports, or layer violations.

**Constraints** (in enforcement order):
1. `domain-purity` – Pure functions only in domain layer
2. `domain-no-side-effects` – No IO or mutations in domain
3. `domain-no-imports-from-app-or-infra` – Domain isolation from outer layers
4. `single-responsibility` – Single-purpose modules
5. `module-complexity-guardrails` – Cyclomatic complexity limits
6. `shared-types-zod-source-of-truth` – Zod schemas for shared contracts
7. `zod-contracts` – Zod-based validation contracts

**Rationale**: Domain layer is the architectural core. Establishing purity and isolation early prevents cascading violations.

**Expected Artifacts**:
- `src/domain/<entity>/` folders with business entities, value objects
- Pure TypeScript modules (no `import fs`, `import express`, etc.)
- Zod schemas in `packages/shared-types/` or `src/domain/schemas/`
- No database calls, HTTP requests, or file system access in domain code

**Validation Scope**: Run validation with `--phase domain` to check Phase 1 + Phase 2 constraints.

**Prompt Size Estimate**: ~7-8KB (7 constraints)

---

### Phase 3: Infrastructure Layer
**Purpose**: Implement adapters for external systems (databases, APIs, file systems) using ports & adapters pattern.

**Constraints** (in enforcement order):
1. `ports-and-adapters-integrity` – Repository pattern, port/adapter separation
2. `clean-layer-direction` – Dependencies flow inward (infra → domain, not domain → infra)
3. `prisma-data-access` – Prisma ORM usage if applicable
4. `axios-client-only` – Axios HTTP client usage patterns
5. `api-boundary-hygiene` – API contract enforcement at boundaries

**Rationale**: Infrastructure depends on domain interfaces (ports). This phase builds adapters without polluting domain purity.

**Expected Artifacts**:
- `src/infrastructure/persistence/` for database adapters
- `src/infrastructure/http-clients/` for external API clients
- Port interfaces in `src/domain/ports/` (e.g., `IUserRepository`)
- Adapter implementations in `src/infrastructure/adapters/`

**Validation Scope**: Run validation with `--phase infrastructure` to check Phase 1-3 constraints.

**Prompt Size Estimate**: ~5-6KB (5 constraints)

---

### Phase 4: Application Layer
**Purpose**: Implement use cases and orchestration logic that coordinates domain and infrastructure.

**Constraints** (in enforcement order):
1. `mvc-layer-separation` – MVC pattern if applicable
2. `mvp-presenter-boundaries` – MVP pattern presenter separation
3. `mvvm-binding-integrity` – MVVM pattern binding rules
4. `app-no-imports-from-infra` – Application layer uses ports, not concrete adapters
5. `ui-isolation` – UI concerns isolated from business logic
6. `test-coverage-contracts` – Test coverage requirements (80%+)

**Rationale**: Use cases orchestrate domain entities and call infrastructure through ports. Tests verify behavior contracts.

**Expected Artifacts**:
- `src/application/use-cases/` or `src/features/<feature>/usecases/`
- Use case modules that import domain entities and domain ports
- Test files: `*.test.ts` achieving 80%+ coverage
- No direct imports of Prisma, Axios, Fastify in use case files

**Completion Criteria**:
- `npm run build` succeeds without TypeScript errors.
- `npm test` passes and every contract module has tests that import it and cover at least one valid and one invalid payload.
- `cda run --phase application --exec` reports **0 violations** (including `test-coverage-contracts`).
- Agents MUST NOT advance to Phase 5 while any Phase 4 violations remain; treat constraints as blocking contracts.

**Validation Scope**: Run validation with `--phase application` to check Phase 1-4 constraints.

**Prompt Size Estimate**: ~6-7KB (6 constraints)

---

### Phase 5: Presentation Layer
**Purpose**: Implement HTTP controllers, React components, Next.js routes—framework-specific presentation code.

**Constraints** (in enforcement order):
1. `fastify-http-server` – Fastify server structure and route organization
2. `nextjs-app-structure` – Next.js App Router conventions
3. `react-ui-only` – React components pure UI rendering
4. `tanstack-query-async` – TanStack Query for async state management

**Rationale**: Presentation is the outermost layer. After domain, infra, and application are validated, wire everything together through HTTP/UI.

**Expected Artifacts**:
- Backend: `src/features/<feature>/http.controller.ts` or `src/routes/`
- Frontend: `apps/web/src/features/<feature>/components/`
- Next.js: `apps/web/src/app/` App Router pages/layouts
- React components import TanStack Query hooks, not raw Axios

**Completion Criteria**:
- `npm run build` passes and the runtime (e.g., `npm start`) boots cleanly.
- `cda run --phase presentation --exec` completes with **0 violations** before claiming the phase is done.
- For web-based CRM projects, ship a minimal but usable UI that lets a user create, list, and update the core CRM entities through a browser.
- Do not declare the system complete until the final CDA pass, build, and runtime all succeed together.

**Validation Scope**: Run validation with `--phase presentation` to check ALL constraints (Phase 1-5).

**Prompt Size Estimate**: ~4-5KB (4 constraints)

---

## 5. Command Changes

### 5.1 New `--phase` Flag

Add `--phase <phase-name>` flag to:
- `cda agent [--phase <name>]`
- `cda run [--phase <name>]` (alias for `cda validate`)
- `cda validate [--phase <name>]`

**Valid phase names**: `foundation`, `domain`, `infrastructure`, `application`, `presentation`

**Behavior**:
- Filters active constraints to include only those in the specified phase **and all previous phases**
- Example: `--phase infrastructure` includes Foundation + Domain + Infrastructure constraints
- Rationale: Each phase builds on previous phases; validation must check cumulative conformance

**Constraint-to-Phase Mapping**:
- Stored in new `PHASE_CONSTRAINTS` constant in `src/core/types.ts`:

```typescript
export const PHASES = [
  "foundation",
  "domain", 
  "infrastructure",
  "application",
  "presentation"
] as const;

export type Phase = typeof PHASES[number];

export const PHASE_CONSTRAINTS: Record<Phase, string[]> = {
  foundation: [
    "central-config-entrypoint",
    "observability-discipline",
    "structural-naming-consistency",
    "file-naming",
    "folder-naming",
    "max-file-lines",
    "excessive-nesting"
  ],
  domain: [
    "domain-purity",
    "domain-no-side-effects",
    "domain-no-imports-from-app-or-infra",
    "single-responsibility",
    "module-complexity-guardrails",
    "shared-types-zod-source-of-truth",
    "zod-contracts"
  ],
  infrastructure: [
    "ports-and-adapters-integrity",
    "clean-layer-direction",
    "prisma-data-access",
    "axios-client-only",
    "api-boundary-hygiene"
  ],
  application: [
    "mvc-layer-separation",
    "mvp-presenter-boundaries",
    "mvvm-binding-integrity",
    "app-no-imports-from-infra",
    "ui-isolation",
    "test-coverage-contracts"
  ],
  presentation: [
    "fastify-http-server",
    "nextjs-app-structure",
    "react-ui-only",
    "tanstack-query-async"
  ]
};
```

**Cumulative Filtering Logic**:

```typescript
function getConstraintsForPhase(phase: Phase, allConstraints: ConstraintMeta[]): ConstraintMeta[] {
  const phaseIndex = PHASES.indexOf(phase);
  const includedPhases = PHASES.slice(0, phaseIndex + 1);
  
  const includedIds = new Set(
    includedPhases.flatMap(p => PHASE_CONSTRAINTS[p])
  );
  
  return allConstraints.filter(c => includedIds.has(c.id));
}
```

**Validation**:
- If `--phase <invalid>` provided, throw `CONFIG_ERROR` with valid phase names
- If `--phase` used with `--constraint`, throw `CONFIG_ERROR` (mutually exclusive flags)
- If `--phase` used with `--sequential`, throw `CONFIG_ERROR` (mutually exclusive flags)

### 5.2 Command Examples

```bash
# Phase 1: Implement foundation (config, logging, structure)
cda agent --phase foundation --dry-run  # Preview prompt
cda agent --phase foundation             # Execute with agent
npm run build && cda run --phase foundation --exec  # Validate

# Phase 2: Implement domain layer (pure business logic)
cda agent --phase domain --dry-run
cda agent --phase domain
npm run build && cda run --phase domain --exec

# Phase 3: Implement infrastructure (DB, HTTP clients)
cda agent --phase infrastructure --dry-run
cda agent --phase infrastructure
npm run build && cda run --phase infrastructure --exec

# Phase 4: Implement application layer (use cases)
cda agent --phase application --dry-run
cda agent --phase application
npm run build && cda run --phase application --exec

# Phase 5: Implement presentation layer (HTTP routes, React UI)
cda agent --phase presentation --dry-run
cda agent --phase presentation
npm run build && cda run --phase presentation --exec

# Traditional all-at-once workflow still works
cda agent --dry-run  # Full 43KB prompt with all constraints
```

---

## 6. Onboarding Guide Changes (`CDA.md`)

### 6.1 Updated Command Sequence

Replace current 6-step sequence with **10-step phase-gated workflow**:

```markdown
## STOP - Mandatory Phase-Gated Command Sequence

Do not continue until each command succeeds in this exact order:

### Phase 1: Foundation (Config, Logging, Structure)
1. Run `npm install` to fetch dependencies. If `package.json` is missing, create it first.
2. Run `npm run build` to ensure TypeScript compiles. Create minimal scaffolding if needed (empty `src/index.ts`).
3. Run `cda agent --phase foundation --dry-run` and archive the prompt + run_id.
4. Implement Phase 1 changes (config entrypoint, logger, folder structure).
5. Run `npm run build` to verify compilation.
6. Run `cda run --phase foundation --exec` to validate. **Do not proceed to Phase 2 until this passes.**

### Phase 2: Domain Layer (Pure Business Logic)
7. Run `cda agent --phase domain --dry-run` and archive the prompt + run_id.
8. Implement Phase 2 changes (domain entities, Zod schemas, pure functions).
9. Run `npm run build` to verify compilation.
10. Run `cda run --phase domain --exec` to validate. **Do not proceed to Phase 3 until this passes.**

### Phase 3: Infrastructure Layer (Adapters, Ports)
11. Run `cda agent --phase infrastructure --dry-run` and archive the prompt + run_id.
12. Implement Phase 3 changes (database adapters, HTTP clients, repository implementations).
13. Run `npm run build` to verify compilation.
14. Run `cda run --phase infrastructure --exec` to validate. **Do not proceed to Phase 4 until this passes.**

### Phase 4: Application Layer (Use Cases, Orchestration)
15. Run `cda agent --phase application --dry-run` and archive the prompt + run_id.
16. Implement Phase 4 changes (use cases, test coverage).
17. Run `npm run build` to verify compilation.
18. Run `cda run --phase application --exec` to validate. **Do not proceed to Phase 5 until this passes.**

### Phase 5: Presentation Layer (HTTP, React, Next.js)
19. Run `cda agent --phase presentation --dry-run` and archive the prompt + run_id.
20. Implement Phase 5 changes (Fastify routes, Next.js pages, React components).
21. Run `npm run build` to verify compilation.
22. Run `cda run --phase presentation --exec` to validate. **All constraints must pass.**

After each command, paste the command + outcome into your transcript before moving on.
```

### 6.2 Phase-Specific Guidance Sections

Add new section to `CDA.md` after the command sequence:

```markdown
## Phase Implementation Order Rationale

**Why 5 phases?**
- Each phase builds on previous phases (foundation → domain → infra → app → presentation)
- Early validation catches architectural drift before it spreads
- Smaller prompts (5-8KB per phase) vs overwhelming 43KB monolithic prompt
- Natural alignment with layered architecture principles

**What if I violate a Phase 1 constraint during Phase 3 implementation?**
- Run `cda run --phase <current-phase> --exec` to revalidate cumulative constraints
- Fix violations immediately—don't wait until Phase 5
- Phase boundaries are checkpoints, not isolated sandboxes

**Can I skip phases?**
- No. Phases must be completed sequentially.
- Each phase assumes previous phases are complete and validated.
- Skipping phases results in architectural incoherence.

**When should I use traditional all-at-once workflow (`cda agent` without `--phase`)?**
- Maintenance tasks on mature codebases (bug fixes, refactoring)
- When implementing a single feature in an existing architecture
- Code reviews and audits
- Not recommended for greenfield projects or major restructuring
```

---

## 7. Prompt Assembly Changes

### 7.1 Phase-Specific Prompt Metadata

When `--phase` flag is present, `assemblePrompt` in `src/core/promptAssembler.ts` adds:

```typescript
interface PhaseMetadata {
  phase_mode: Phase;
  phase_number: number; // 1-5
  phase_label: string; // "Phase 1: Foundation"
  included_phases: Phase[]; // ["foundation"] or ["foundation", "domain"] etc
  constraints_in_phase: number;
  cumulative_constraints: number;
  next_phase?: Phase;
}
```

Example banner:

```
========================================
CDA AGENT PROMPT - PHASE 2: DOMAIN LAYER
========================================

Phase Mode: domain (Phase 2 of 5)
Included Phases: foundation, domain
Constraints in This Phase: 7
Cumulative Constraints: 14 (Phase 1-2)
Next Phase: infrastructure

run_id: 2025-11-16T10:30:00.000Z-a1b2c3
instruction_format_version: 2
agent_name: copilot-stdin
disabled_constraints: []

=== PHASE 2 OBJECTIVE ===
Implement the pure domain layer with business entities, value objects, and Zod contracts.
All code must be side-effect-free with no framework imports.

Validation scope: This prompt checks Phase 1 (Foundation) AND Phase 2 (Domain) constraints.
Previous phase (foundation) should already be validated and passing.

=== ARCHITECTURAL CONTEXT ===
You are implementing Phase 2 of a 5-phase workflow:
- Phase 1 (Foundation) ✅ COMPLETED - Config, logging, folder structure in place
- Phase 2 (Domain) ⚙️ IN PROGRESS - Pure business logic layer
- Phase 3 (Infrastructure) ⏳ PENDING - Database and HTTP adapters
- Phase 4 (Application) ⏳ PENDING - Use cases and orchestration
- Phase 5 (Presentation) ⏳ PENDING - HTTP routes and React UI

Key principles for Phase 2:
- Domain layer must be 100% pure (no IO, no side effects)
- No imports from application, infrastructure, or presentation layers
- Use Zod for all shared type contracts
- Focus on business entities, value objects, and domain services

[... instruction text with only Phase 1 + Phase 2 constraints ...]
```

### 7.2 Phase Navigation Hints

At the end of each phase prompt, add:

```
=== NEXT STEPS ===
After implementing Phase 2 changes:
1. Run `npm run build` to verify TypeScript compilation
2. Run `cda run --phase domain --exec` to validate Phase 1-2 constraints
3. Fix any violations before proceeding
4. Once validation passes, advance to Phase 3:
   - Run `cda agent --phase infrastructure --dry-run`
   - Review the Phase 3 prompt
   - Proceed with infrastructure implementation

Do NOT implement Phase 3 code during Phase 2. Stay focused on domain purity.
```

---

## 8. Constraint Metadata Changes

### 8.1 New `phase` Field (Optional Enhancement)

Consider adding `phase: Phase` field to constraint frontmatter for explicit phase assignment:

```yaml
---
constraint_id: domain-purity
name: Domain Purity
severity: error
enforcement_order: 20
phase: domain  # NEW FIELD
optional: false
---
```

**Rationale**:
- Explicit phase assignment in metadata (vs hardcoded mapping in code)
- Easier to reassign constraints to different phases without code changes
- Self-documenting constraint organization

**Implementation**:
- Add `phase?: Phase` to `ConstraintMeta` interface
- Update `loadConstraints` to parse `phase` from frontmatter
- Fall back to `PHASE_CONSTRAINTS` mapping if `phase` field missing (backward compatibility)
- Validation: If both `phase` field and `PHASE_CONSTRAINTS` disagree, throw warning

**Migration Path**:
- Phase 1 (v0.6.0): Implement `PHASE_CONSTRAINTS` hardcoded mapping (functional immediately)
- Phase 2 (v0.7.0): Add `phase` frontmatter field to constraints (gradual migration)
- Phase 3 (v0.8.0): Deprecate `PHASE_CONSTRAINTS`, require `phase` field in all constraints

---

## 9. Error Handling & Edge Cases

### 9.1 Invalid Phase Name
```bash
cda agent --phase domainz
# Error: Invalid phase 'domainz'. Valid phases: foundation, domain, infrastructure, application, presentation
```

### 9.2 Mutually Exclusive Flags
```bash
cda agent --phase domain --constraint domain-purity
# Error: Cannot use --phase and --constraint together. Choose one filtering mode.

cda agent --phase domain --sequential
# Error: Cannot use --phase and --sequential together.
```

### 9.3 Disabled Constraint in Phase
```bash
# In cda.config.json:
# "constraint_overrides": { "observability-discipline": { "enabled": false } }

cda agent --phase foundation
# Warning: Phase 'foundation' includes disabled constraint 'observability-discipline'.
# Constraint will be excluded from prompt but phase validation may be incomplete.
# Consider enabling all mandatory constraints for phased workflow.
```

### 9.4 Empty Phase (All Constraints Disabled)
```bash
# If user disables all Phase 1 constraints via overrides
cda agent --phase foundation
# Error: No active constraints for phase 'foundation'. All constraints disabled via overrides.
# Phase-gated workflow requires at least one active constraint per phase.
```

### 9.5 Missing Constraint in Phase Mapping
```bash
# If new constraint added but not assigned to any phase
cda agent --phase presentation
# Warning: Constraint 'new-experimental-rule' not assigned to any phase. Excluded from phased prompts.
# Constraint will still appear in non-phased prompts (cda agent without --phase).
```

---

## 10. Testing Strategy

### 10.1 Unit Tests

**File**: `tests/phaseGatedValidation.test.ts`

```typescript
describe("Phase-gated validation", () => {
  it("getConstraintsForPhase includes cumulative constraints", () => {
    const constraints = loadConstraints();
    const phaseConstraints = getConstraintsForPhase("domain", constraints);
    
    // Should include Phase 1 + Phase 2 constraints
    expect(phaseConstraints).toHaveLength(14); // 7 foundation + 7 domain
    expect(phaseConstraints.some(c => c.id === "central-config-entrypoint")).toBe(true); // Phase 1
    expect(phaseConstraints.some(c => c.id === "domain-purity")).toBe(true); // Phase 2
    expect(phaseConstraints.some(c => c.id === "fastify-http-server")).toBe(false); // Phase 5
  });

  it("validates phase name", () => {
    expect(() => getConstraintsForPhase("invalid" as Phase, [])).toThrow(CONFIG_ERROR);
  });

  it("respects constraint_overrides in phased mode", () => {
    const config = { constraint_overrides: { "observability-discipline": { enabled: false } } };
    const constraints = loadConstraints(config);
    const phaseConstraints = getConstraintsForPhase("foundation", constraints);
    
    expect(phaseConstraints.some(c => c.id === "observability-discipline")).toBe(false);
  });
});
```

### 10.2 Integration Tests

**File**: `tests/cli/phaseCommand.integration.test.ts`

```typescript
describe("cda agent --phase", () => {
  it("generates phase-specific prompt with correct constraints", async () => {
    const result = await runCli(["agent", "--phase", "domain", "--dry-run"]);
    
    expect(result.stdout).toContain("Phase Mode: domain (Phase 2 of 5)");
    expect(result.stdout).toContain("domain-purity");
    expect(result.stdout).toContain("central-config-entrypoint"); // From Phase 1
    expect(result.stdout).not.toContain("fastify-http-server"); // Phase 5, not included
  });

  it("errors on mutually exclusive flags", async () => {
    const result = await runCli(["agent", "--phase", "domain", "--constraint", "domain-purity"]);
    
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Cannot use --phase and --constraint together");
  });
});
```

### 10.3 End-to-End Test

**File**: `tests/integration/phaseGatedWorkflow.test.ts`

Simulate full 5-phase workflow in a test project:
1. Run `cda init`
2. For each phase (foundation → presentation):
   - Generate phase prompt
   - Verify constraint count
   - Verify cumulative behavior
   - Check prompt size < 10KB
3. Verify final phase includes all constraints

---

## 11. Documentation Updates

### 11.1 README.md

Add new section:

```markdown
### Phase-Gated Workflow (Recommended for New Projects)

For greenfield projects, use the phase-gated workflow to implement architecture incrementally:

1. **Phase 1 - Foundation**: Config, logging, folder structure
2. **Phase 2 - Domain**: Pure business logic with Zod contracts
3. **Phase 3 - Infrastructure**: Database adapters, HTTP clients
4. **Phase 4 - Application**: Use cases and orchestration
5. **Phase 5 - Presentation**: HTTP routes, React components

Each phase validates cumulative constraints before advancing:

```bash
# Implement and validate each phase
cda agent --phase foundation
npm run build && cda run --phase foundation --exec

cda agent --phase domain
npm run build && cda run --phase domain --exec

# ... continue through all 5 phases
```

See `CDA.md` (generated by `cda init`) for detailed phase-by-phase workflow.
```

### 11.2 CHANGELOG.md

Add entry for v0.6.0:

```markdown
## [0.6.0] - 2025-11-17

### Added
- **Phase-gated validation workflow** for autonomous agents:
  - New `--phase <name>` flag for `cda agent`, `cda run`, and `cda validate` commands
  - 5 architectural phases: foundation, domain, infrastructure, application, presentation
  - Cumulative constraint filtering (each phase validates all previous phases)
  - Phase-specific prompt metadata and navigation hints
  - Updated `CDA.md` onboarding guide with 10-step phase-gated workflow
- Phase-to-constraint mapping in `src/core/types.ts` (`PHASE_CONSTRAINTS`)
- Prompt size reduction: 5-8KB per phase vs 43KB monolithic prompt

### Changed
- `assemblePrompt` in `promptAssembler.ts` supports phase-specific banners and filtering
- `buildOnboardingGuide` in `cdaOnboardingGuide.ts` generates 22-step phase-gated sequence

### Fixed
- Agent prompt overload issue (addresses poor first-run results with massive prompts)
- Late validation problem (incremental checkpoints prevent architectural drift)
```

### 11.3 New Document: `PHASE_GUIDE.md`

Create user-facing guide explaining phase-gated workflow:

```markdown
# Phase-Gated Implementation Guide

[Detailed walkthrough of each phase with examples, expected artifacts, common mistakes, troubleshooting]
```

---

## 12. Implementation Checklist

### Phase 1: Core Infrastructure (v0.6.0-alpha.1)
- [ ] Add `PHASES`, `Phase`, `PHASE_CONSTRAINTS` to `src/core/types.ts`
- [ ] Implement `getConstraintsForPhase(phase: Phase, constraints: ConstraintMeta[]): ConstraintMeta[]`
- [ ] Add `--phase <name>` flag parsing to `src/cli/commands/agent.ts`
- [ ] Add `--phase <name>` flag parsing to `src/cli/commands/run.ts`
- [ ] Add `--phase <name>` flag parsing to `src/cli/commands/validate.ts`
- [ ] Implement mutual exclusion validation (`--phase` vs `--constraint`, `--sequential`)
- [ ] Update `assemblePrompt` to accept `phase?: Phase` parameter
- [ ] Generate phase-specific metadata banner when `phase` provided
- [ ] Update `buildBatchInstructionPackage` to filter constraints by phase
- [ ] Unit tests: `getConstraintsForPhase`, phase validation, flag conflicts
- [ ] Integration tests: `cda agent --phase`, `cda run --phase`

### Phase 2: Onboarding Guide (v0.6.0-alpha.2)
- [ ] Update `buildOnboardingGuide` in `src/core/cdaOnboardingGuide.ts`
- [ ] Generate 22-step phase-gated command sequence
- [ ] Add phase rationale and navigation sections
- [ ] Add "Phase Implementation Order Rationale" section
- [ ] Add "Next Steps" hints per phase in prompt assembly
- [ ] Generate `CDA.md` in test project and verify structure

### Phase 3: Documentation (v0.6.0-beta.1)
- [ ] Update README.md with phase-gated workflow section
- [ ] Update CHANGELOG.md with v0.6.0 release notes
- [ ] Create `PHASE_GUIDE.md` with detailed phase walkthrough
- [ ] Add `--phase` flag to CLI help text (`--help` output)
- [ ] Update `SPECIFICATION_NEW.md` with phase-gated additions

### Phase 4: Testing & Validation (v0.6.0-rc.1)
- [ ] End-to-end test: Full 5-phase workflow in fresh project
- [ ] Measure prompt sizes per phase (verify all < 10KB)
- [ ] Test with real agent (GitHub Copilot CLI) in greenfield project
- [ ] Measure first-run violations with phase-gated vs monolithic
- [ ] Target: <12 violations after Phase 5 completion
- [ ] Snapshot tests: Phase-specific prompts for regression detection

### Phase 5: Release (v0.6.0)
- [ ] Bump version to 0.6.0 in `package.json`
- [ ] Update `dist/` build artifacts
- [ ] Create git tag `v0.6.0`
- [ ] Publish release notes
- [ ] Update documentation site (if applicable)

---

## 13. Success Metrics

### Primary Metric: First-Run Violation Reduction
- **Baseline** (no phase-gating): 24-34 violations on fresh implementation
- **Target** (phase-gated): <12 violations after Phase 5 completion
- **Measurement**: Run controlled test with GitHub Copilot CLI implementing CRM monorepo from scratch
- **Current data point**: The `tests/fixtures/projects/full-stack/next-baseline` fixture (fully compliant) produces **0 violations at every phase checkpoint** once optional MVC/MVP/MVVM/test coverage constraints are enabled. Real-agent CRM measurements are scheduled post-v0.6.0 to capture noisy/greenfield violation counts.

### Secondary Metrics:
- **Prompt Size**: Each phase prompt <10KB (vs 43KB baseline)
- **Agent Comprehension**: Subjective assessment of agent responses (focused vs scattered)
- **Time to First Validation**: Faster feedback loop (Phase 1 validation in 5 mins vs 30+ mins for full implementation)
- **Architectural Drift**: Fewer layer violations in later phases (caught at phase boundaries)

#### Prompt Size Measurement (next-baseline fixture)
Captured via `node dist/cli/index.js agent --phase <name> --dry-run --no-exec` after enabling optional pattern/test constraints:

| Phase | Characters | Size (KB) |
|-------|------------|-----------|
| foundation | 13,051 | 12.75 |
| domain | 20,926 | 20.44 |
| infrastructure | 27,879 | 27.23 |
| application | 37,178 | 36.31 |
| presentation | 41,623 | 40.65 |
| legacy (no `--phase`) | 39,714 | 38.78 |

The first four phases stay below the previous 43KB monolithic prompt. Phase 5 adds the presentation constraints plus the phase objective/context/next-steps sections, resulting in a slightly larger prompt than the legacy full-batch output (still bounded at ~41KB). Further reductions (smaller phase-specific guidance, optional compression) are slated for v0.6.1.

### Qualitative Indicators:
- Agent asks fewer clarifying questions during implementation
- Agent references architectural principles correctly in commit messages
- Fewer "shotgun refactoring" sessions after full implementation
- Agent completes phases without backtracking to earlier phases

---

## 14. Future Enhancements (Post-v0.6.0)

### 14.1 Phase Templates
Generate phase-specific scaffolding:

```bash
cda scaffold --phase foundation
# Creates src/config/index.ts, src/lib/logger.ts, basic folder structure
```

### 14.2 Phase Checkpoints
Persist phase completion state in `.cda/state.json`:

```json
{
  "completed_phases": ["foundation", "domain"],
  "current_phase": "infrastructure",
  "phase_validation_history": [
    { "phase": "foundation", "timestamp": "2025-11-16T10:00:00Z", "violations": 0 },
    { "phase": "domain", "timestamp": "2025-11-16T11:00:00Z", "violations": 2 }
  ]
}
```

### 14.3 Phase Visualizations
ASCII art progress indicator:

```
CDA Phase Progress:
[✓] Phase 1: Foundation
[✓] Phase 2: Domain
[⚙] Phase 3: Infrastructure (in progress)
[ ] Phase 4: Application
[ ] Phase 5: Presentation
```

### 14.4 Inter-Phase Dependencies
Define explicit dependencies beyond sequential order:

```typescript
const PHASE_DEPENDENCIES: Record<Phase, Phase[]> = {
  infrastructure: ["foundation", "domain"], // Infrastructure requires both
  application: ["domain", "infrastructure"], // Can't build use cases without domain + adapters
};
```

### 14.5 Custom Phase Definitions
Allow users to define project-specific phases in `cda.config.json`:

```json
{
  "version": 1,
  "constraints": "builtin",
  "phases": {
    "enabled": true,
    "custom_phases": [
      {
        "name": "security",
        "constraints": ["auth-middleware", "input-sanitization"],
        "after": "infrastructure"
      }
    ]
  }
}
```

---

## 15. Appendix: Constraint-to-Phase Assignment Rationale

### Why These Constraints in Foundation?
- `central-config-entrypoint`: Every layer needs config access
- `observability-discipline`: Logging required from the start
- `structural-naming-consistency`, `file-naming`, `folder-naming`: Prevents later refactoring
- `max-file-lines`, `excessive-nesting`: Structural guardrails before writing code

### Why These Constraints in Domain?
- `domain-purity`, `domain-no-side-effects`: Core domain principles
- `domain-no-imports-from-app-or-infra`: Layer isolation
- `single-responsibility`, `module-complexity-guardrails`: Code quality fundamentals
- `shared-types-zod-source-of-truth`, `zod-contracts`: Type safety for domain entities

### Why These Constraints in Infrastructure?
- `ports-and-adapters-integrity`: Repository pattern central to infrastructure
- `clean-layer-direction`: Enforce dependency flow (infra → domain)
- `prisma-data-access`, `axios-client-only`, `api-boundary-hygiene`: Framework-specific adapter rules

### Why These Constraints in Application?
- `mvc-layer-separation`, `mvp-presenter-boundaries`, `mvvm-binding-integrity`: Presentation patterns
- `app-no-imports-from-infra`: Use cases depend on ports, not concrete adapters
- `ui-isolation`: Separate UI from business logic
- `test-coverage-contracts`: Validate use cases with tests

### Why These Constraints in Presentation?
- `fastify-http-server`, `nextjs-app-structure`, `react-ui-only`, `tanstack-query-async`: Framework-specific presentation rules
- These are outermost layer, depend on everything else

### Orphaned Constraints (Not Yet Assigned)?
If new constraints don't fit cleanly:
- Add to most relevant phase or create sub-phase
- Consider if constraint is truly necessary or overlaps existing rules

---

## 16. Migration Path for Existing Projects

Phase-gated workflow is **optional** and **non-breaking**:

- **Existing projects**: Continue using `cda agent` (without `--phase`)
- **New projects**: Use `cda agent --phase <name>` workflow
- **Gradual adoption**: Run phases on specific features/modules in existing projects

No changes required to existing `cda.config.json` or constraint files.

Phase-gated validation is purely a **presentation optimization** for prompts, not a data model change.

---

## 17. Open Questions & Decisions Needed

1. **Should `--phase all` be an alias for traditional non-phased behavior?**
   - Pro: Explicit opt-in for full prompt
   - Con: `cda agent` (no flag) already does this; adds redundancy
   - **Decision**: No alias needed; traditional workflow remains default when `--phase` omitted

2. **Should phase completion be persisted in `.cda/state.json`?**
   - Pro: Agents know where they left off
   - Con: Adds state management complexity
   - **Decision**: Post-v0.6.0 enhancement (Phase Checkpoints)

3. **Should constraints have explicit `phase` frontmatter field or rely on code mapping?**
   - Pro (frontmatter): Self-documenting, easier reassignment
   - Con (frontmatter): Migration burden, backward compatibility
   - **Decision**: Start with `PHASE_CONSTRAINTS` code mapping; add frontmatter in v0.7.0

4. **What happens if a constraint is disabled mid-phase?**
   - Scenario: User disables `observability-discipline` after Phase 1 completes
   - **Decision**: Warning message; phase validation incomplete but not blocking

5. **Should phases be reorderable or always sequential?**
   - **Decision**: Always sequential; phases have hard dependencies (can't build app without domain)

---

## 18. Risk Assessment

### Low Risk
- Backward compatibility maintained (non-phased workflow unchanged)
- Pure additive feature (no existing functionality removed)
- Constraint content unchanged (no validation algorithm edits)

### Medium Risk
- Increased command surface area (more flags, more edge cases)
- Onboarding guide complexity (22 steps vs 6 steps)
- Testing burden (combinatorial flag interactions)

### High Risk
- Agent confusion if phase workflow not clearly explained
- Prompt size estimates may be wrong (some phases could exceed 10KB)
- Constraint-to-phase mapping may not align with all architectures

### Mitigation Strategies
- Comprehensive documentation (`PHASE_GUIDE.md`, updated `CDA.md`)
- Real-world testing with GitHub Copilot CLI before release
- Fallback: If phase-gated doesn't reduce violations, mark as experimental and iterate

---

## 19. Version History

- **v1.0** (2025-11-16): Initial specification
  - Defined 5 phases with constraint mappings
  - Specified `--phase` flag behavior
  - Outlined onboarding guide changes
  - Established success metrics (<12 violations target)

---

**Specification Status**: ✅ APPROVED FOR IMPLEMENTATION  
**Target Release**: v0.6.0  
**Implementation Priority**: HIGH (addresses critical first-run quality issues)  
**Estimated Effort**: 5-7 days (3 days core implementation, 2 days testing/docs, 2 days validation)
