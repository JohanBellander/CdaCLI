# IMP_FF: Implementation Plan for Phase 4–5 Full-Fidelity Behavior

This plan describes concrete changes needed to realize the behavior specified in `SPEC_FF.md`, focusing on:
- Tightening Phase 4–5 prompts/specs.
- Clarifying and enforcing `test-coverage-contracts`.
- Making "no advancing with violations" explicit and visible to agents.

The plan is intentionally incremental and should be executed in small PRs.

---

## 1. Wire SPEC_FF into Core Documentation

**Goal:** Make the new rules visible to both humans and agents.

1.1 Update `CDA.md`
- Add a short section **"Full-Fidelity Phase Behavior"** that:
  - Summarizes the key points from `SPEC_FF.md` (constraints as contracts, no phase skipping, loop-until-green).
  - Explicitly mentions that Phases 4 and 5 are hard-gated like Phases 1–3.
- Link to `SPEC_FF.md` as the detailed reference.

1.2 Update top-level phase spec overview (e.g., `SPEC_PHASES.md`)
- For Phase 4 and Phase 5 entries, add 1–2 bullets each:
  - Phase 4: mention contract test coverage and 0-violation requirement.
  - Phase 5: mention final CDA pass and usable UI for web-based projects.

---

## 2. Tighten Phase 4 Prompt and Constraints

**Goal:** Ensure agents treat Phase 4 as blocking until tests + CDA are green.

2.1 Phase 4 spec text
- Open the Phase 4 specification file (e.g., `SPEC_PHASES.md` or a dedicated Application-phase spec if present).
- Under Phase 4, add an explicit **"Completion Criteria"** list matching `SPEC_FF`:
  - `npm run build` passes.
  - `npm test` passes.
  - `cda run --phase application --exec` → 0 violations.
  - Contract tests: at least one valid and one invalid case per contract module.

2.2 Phase 4 agent prompt template
- Locate where the agent prompt for Phase 4 is assembled (likely in `src/core/promptAssembler.ts` or a similar file).
- Inject explicit instructions near the top of the Phase 4 section:
  - "You must not proceed to Phase 5 or claim completion of Phase 4 while `cda run --phase application --exec` reports any violations."
  - "Follow this loop: implement/refine → `npm run build` → `npm test` → `cda run --phase application --exec`. If there are violations, iterate until 0 violations."

2.3 Anti-pattern warnings for Phase 4
- In the Phase 4 prompt or spec, add a short **"Avoid"** subsection listing:
  - Adding placeholder tests that do not import contracts.
  - Advancing to Phase 5 with known `test-coverage-contracts` violations.

---

## 3. Clarify and Enforce `test-coverage-contracts`

**Goal:** Make coverage expectations concrete and discourage trivial tests.

3.1 Update `test-coverage-contracts.md`
- Add explicit language mirroring `SPEC_FF`:
  - For each contract module, require:
    - At least one test file.
    - At least one valid and one invalid sample.
  - Clarify what does **not** count (no-op tests, tests that don’t import the contract).

3.2 Constraint configuration (if applicable)
- If the constraint has a configuration file or code-based implementation (e.g., in `src/constraints`):
  - Ensure contract file patterns and test file patterns are clearly defined.
  - Optionally, log a warning when tests are detected but contain no assertions (if feasible without over-engineering).

3.3 Guidance in agent prompt
- In the Phase 4 prompt, add 1–2 lines that:
  - Encourage agents to write small realistic tests using sample payloads.
  - Remind them that `expect(true).toBe(true)`-style placeholders are not acceptable.

---

## 4. Tighten Phase 5 Prompt and Constraints

**Goal:** Make Phase 5 behave like a true final gate with a usable UI.

4.1 Phase 5 spec text
- In the Phase 5 section of `SPEC_PHASES.md` (or per-phase spec):
  - Add **"Completion Criteria"**:
    - `npm run build` passes.
    - Application start command (e.g., `npm start`) runs without errors.
    - `cda run --phase presentation --exec` → 0 violations.
    - For web-based CRM: a browser-accessible UI that supports at least create/list/update for core entities.

4.2 Phase 5 agent prompt template
- In the prompt assembly code, modify the Phase 5 section to:
  - Explicitly require a final `cda run --phase presentation --exec` with 0 violations before claiming completion.
  - Require the agent to start the app and verify the UI is reachable (within its abilities, e.g., by reading server logs or describing expected URL).

4.3 UI expectations
- In Phase 5 spec or constraints, add a short UI expectation note:
  - For projects that specify a **web-based** solution, the agent must provide at least a minimal HTML/JS or framework-based UI, not just an API.

---

## 5. Global "No Skipping" Rule

**Goal:** Prevent agents from using time/token limits as justification to advance with violations.

5.1 Global documentation
- In `CDA.md`, add a concise rule:
  - "Agents must not skip phases or accept constraint violations due to time or token limits. If limits are reached, they must stop and report unresolved constraints instead of advancing."

5.2 PromptAssembler / global prompt header
- In `promptAssembler` (or equivalent), add a short global header for all phases:
  - "For any phase, you may not proceed while `cda run --phase <phase> --exec` reports violations."

---

## 6. Optional: Golden Example / Regression Guard

**Goal:** Provide a reference run and help future debugging.

6.1 Golden log snippet
- Add a short example in docs (e.g., `SPEC_FF.md` or `CDA.md`) that shows a "correct" Phase 4 + 5 sequence:
  - Including `npm run build`, `npm test`, `cda run --phase application --exec` → 0 violations.
  - Then `npm run build`, app start, `cda run --phase presentation --exec` → 0 violations.

6.2 Manual smoke test checklist
- Optionally, add a short checklist (maybe in `PHASE_GUIDE.md`) for maintainers to verify after changes to constraints/prompt assembly.

---

## 7. Rollout Strategy

- Implement steps in this order for minimal disruption:
  1. Documentation updates: `CDA.md`, `SPEC_PHASES.md`, `test-coverage-contracts.md`.
  2. PromptAssembler changes for global rules + Phase 4 & 5 sections.
  3. Any small constraint implementation tweaks (patterns, messaging).
  4. Run a fresh end-to-end agent trial on a sample CRM project.
- Use the new run to validate that:
  - The agent does not advance with violations.
  - It writes meaningful contract tests.
  - It builds and validates Phase 5 with a UI before claiming completion.
