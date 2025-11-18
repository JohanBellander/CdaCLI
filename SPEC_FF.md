# SPEC_FF: Phase 4–5 Full-Fidelity Behavior

This spec defines how Phases 4 (Application) and 5 (Presentation) must behave so that AI agents treat them with the same rigor as Phases 1–3. The goal is **full-fidelity adherence** to CDA constraints: no advancing with violations, no skipping due to time/token limits, and clear expectations for test coverage and UI requirements.

## 1. Global Principles

- **Constraints are contracts**: Any CDA violation is blocking for the current phase.
- **No phase skipping**: Agents must not proceed to a later phase while the current phase has active violations.
- **No "best-effort" completion**: Time, token limits, or perceived complexity are not valid reasons to accept constraint violations.
- **Loop until green**: For each phase, agents should follow a tight loop:
  1. Implement or adjust code.
  2. Run relevant local commands (e.g., `npm test`, `npm run build`).
  3. Run `cda run --phase <phase> --exec`.
  4. If there are violations, return to step 1.
- **Explicit failure reporting**: If constraints truly cannot be satisfied (e.g., missing dependencies, external limits), the agent must stop and report which constraints remain failing and why.

These principles apply across all phases but are **explicitly restated** for Phases 4 and 5 to prevent the "partial completion" behavior observed in early experiments.

## 2. Phase 4: Application Layer – Full-Fidelity Requirements

### 2.1 Phase 4 Objective

Phase 4 must orchestrate domain behavior through application services/use cases that:
- Depend on **ports/interfaces**, not concrete infrastructure adapters.
- Maintain **clean layer boundaries** (no app → infra imports).
- Provide **test coverage** for contracts and application-level flows.

### 2.2 Phase 4 Success Criteria

Phase 4 is **only complete** when ALL of the following are true:

- **CDA validation**:
  - `cda run --phase application --exec` completes with **0 violations**.
- **Build and tests**:
  - `npm run build` (or equivalent) passes.
  - `npm test` (or equivalent) passes.
- **Contract test coverage** (see Section 3):
  - Every contract module covered by `test-coverage-contracts` has at least one meaningful test module.
  - Tests import the contract(s) and exercise at least one success and one failure/edge case.

Agents must not:
- Declare Phase 4 “completed” or move to Phase 5 while any of the above are failing.
- Add trivial/no-op tests (e.g., `expect(true).toBe(true)`) solely to silence coverage constraints.

### 2.3 Agent Behavior Pattern for Phase 4

Prompts and constraints for Phase 4 should guide agents toward this pattern:

1. Implement or refine application services (use cases) that:
   - Accept ports and other dependencies through parameters/constructors.
   - Do not import from infrastructure.
2. Add or refine tests for application services and contracts.
3. Run:
   - `npm run build`
   - `npm test`
   - `cda run --phase application --exec`
4. If **any** violations are reported (including `test-coverage-contracts`):
   - Treat this as **blocking**.
   - Do **not** proceed to Phase 5.
   - Iterate on implementation and tests until 0 violations.

If an agent hits time/token limits before achieving 0 violations, it must:
- Stop work on later phases.
- Report explicitly:
  - Which constraints are still failing.
  - What remains to be done to satisfy them.

## 3. Test-Coverage Contracts – Clarification

This section refines the intent behind `test-coverage-contracts` and similar constraints.

### 3.1 Scope

- Applies to all **contract modules** (e.g., Zod schemas, DTO contracts, API contracts) in the canonical contracts location (e.g., `src/domain/contracts` or equivalent configured path).
- May also apply to key application-layer orchestrations that depend directly on those contracts.

### 3.2 Minimum Expectations

For each contract module `X` (e.g., `contact-contracts.ts`):

- There must exist at least one corresponding test module (e.g., `contact-contracts.test.ts`) that:
  - Imports the public contracts from `X`.
  - Exercises **at least one valid** case:
    - Example: a payload that should pass validation.
  - Exercises **at least one invalid** case:
    - Example: a payload that should fail validation with meaningful errors.

### 3.3 What Does NOT Count as Satisfying Coverage

These patterns should **not** be considered sufficient:

- Tests that do not import the contract module at all.
- Pure placeholders, such as:
  - `expect(true).toBe(true)`.
  - Empty `describe` blocks.
- Tests that only instantiate types without any assertions.

Agents should be nudged (via prompt text in the constraint) to:
- Prefer small but meaningful tests over wide but trivial coverage.
- Use realistic sample payloads that reflect the contract’s intended use.

## 4. Phase 5: Presentation Layer – Full-Fidelity Requirements

### 4.1 Phase 5 Objective

Phase 5 must expose the application through a presentation mechanism (HTTP API, web UI, CLI, etc.) that:
- Respects **clean architecture boundaries** (no UI importing infrastructure details directly where constraints forbid it).
- Provides an actual **usable interface** for the CRM (e.g., browser-based UI) when the project requirements call for it.

### 4.2 Phase 5 Success Criteria

Phase 5 is **only complete** when ALL of the following are true:

- **CDA validation**:
  - `cda run --phase presentation --exec` completes with **0 violations**.
- **Build and runtime**:
  - `npm run build` passes.
  - The application can be started (e.g., `npm start`) without runtime errors.
- **UI availability (for web-based CRM)**:
  - An end user can access the CRM via a browser (e.g., `http://localhost:<port>`), with at least:
    - A way to create, list, and update core entities (e.g., contacts and companies).

### 4.3 Agent Behavior Pattern for Phase 5

Prompts and constraints for Phase 5 should encourage this pattern:

1. Implement or refine presentation components:
   - HTTP routes/controllers.
   - Web UI or other interaction surfaces, as specified by the project.
2. Wire presentation to application layer via ports/use cases (no direct domain/infra violations per constraints).
3. Run:
   - `npm run build`
   - Start the application (e.g., `npm start`).
   - `cda run --phase presentation --exec`.
4. If **any** violations remain, or if the app fails to start:
   - Treat as **blocking** for Phase 5.
   - Do **not** declare the system "complete".
   - Iterate until 0 CDA violations and a healthy runtime.

If an agent cannot satisfy these within its limits, it must:
- Stop and report remaining failing constraints and missing UI behavior.

## 5. Anti-Patterns Observed (to Guard Against)

From earlier runs, we explicitly want to prevent these patterns:

- **Skipping tests**: Implementing application services and then moving on with only minimal or placeholder tests.
- **Phase advancement with violations**: Moving from Phase 4 → 5 while `test-coverage-contracts` or other constraints are still failing.
- **Declaring completion without a final CDA pass**: Claiming the CRM is "complete" without a 0-violation `cda run --phase presentation --exec`.
- **Treating UI as optional** when the project goal explicitly calls for a web-based solution.

Prompts and constraint descriptions for Phases 4 and 5 should call out these anti-patterns explicitly and instruct agents to avoid them.

## 6. Implementation Notes

- This spec is **behavioral**: it describes how Phase 4 and 5 flows should behave. Concrete enforcement is done via:
  - Core constraints (e.g., `test-coverage-contracts`).
  - Phase-specific constraints and prompts.
  - Documentation in `CDA.md` and phase spec files.
- When updating constraints or prompts, align them with this document by:
  - Adding explicit language about "no advancing with violations".
  - Emphasizing meaningful tests rather than placeholders.
  - Making UI expectations for Phase 5 explicit when the product requires a web UI.

This spec can be refined as we learn more from real agent runs, but any changes should preserve the core principle: **Phase 4 and 5 should be treated as hard-gated, non-negotiable, and fully validated, just like Phases 1–3.**
