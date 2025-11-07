# CDA CLI MVP1 Implementation Plan

Date: 2025-11-07
Epic Bead: CDATool-vs6 (Epic: Implement CDA CLI MVP1)

## 1. Objective
Deliver the MVP1 CDA CLI that emits deterministic instruction packages (batch and single-constraint modes) derived from authoritative constraint markdown files, with supporting init/list/describe/validate commands, robust error taxonomy, and a test suite ensuring packaging integrity. No repository code scanning beyond bundled markdown parsing.

## 2. Guiding Principles
- Determinism: Same inputs → identical instruction output ordering and schema.
- Minimal Footprint: Only create `cda.config.json` and `CDA.md` in target project via `cda init`.
- Strict Parsing: All 16 authoritative sections required; missing section = BUNDLE_ERROR.
- Separation of Concerns: Loader parses & validates; emitter assembles instruction packages; CLI orchestrates.
- Test First for Parsing Integrity & Negative Cases.

## 3. High-Level Phases
1. Core Scaffolding & Types
2. Constraint Authoring & Loader
3. Instruction Emission & CLI Commands
4. Error Handling & Utilities
5. Documentation & Generated Artifacts
6. Testing & Verification
7. Versioning & Maintenance Guidance

## 4. Dependencies & Sequencing
Ordered execution (each bead independent once prior prerequisites are met):
1. CDATool-kf0 (Scaffold: package.json & tsconfig) → baseline TS build
2. CDATool-5ej (Define core types) → interfaces required by loader/emitter
3. CDATool-cv3 (Author 8 constraint markdown files) → raw inputs for loader
4. CDATool-m38 (Implement constraintLoader.ts) → parses authoritative constraints
5. CDATool-sbo (Implement instructionEmitter.ts) → needs types + parsed constraints
6. CDATool-rjo (Helper: runId generator) → used by validate output packaging
7. CDATool-4ei (Error taxonomy & exit codes) → integrated across CLI layer
8. CDATool-oba (CLI: cda init command) → uses emitter indirectly for CDA.md summaries
9. CDATool-he5 (Init: generate CDA.md content) → invoked within init
10. CDATool-qi3 (CLI: cda list command) → requires loader order meta
11. CDATool-beo (CLI: cda describe <id>) → needs loader full section exposure
12. CDATool-pkz (CLI: cda validate batch) → uses emitter + runId
13. CDATool-i0q (CLI: cda validate --constraint <id>) → single package emission
14. CDATool-llf (Tests: parsing & packaging integrity) → after loader & emitter
15. CDATool-i04 (Tests: snapshot instruction packages) → after validate commands
16. CDATool-9dl (README: usage & agent workflow) → references command behaviors
17. CDATool-s2r (Versioning & maintenance guidance) → final doc

## 5. Detailed Task Breakdown
### CDATool-kf0 Scaffold: package.json & tsconfig
Purpose: Establish Node 18+ TypeScript project with minimal deps (typescript, vitest). Ensure script entries for build and test.
Acceptance: `npm run build` emits `dist/`; no extraneous dependencies.

### CDATool-5ej Define core types (types.ts)
Purpose: Implement interfaces from SPECIFICATION section 12 (ConstraintMeta, InstructionConstraintBlock, BatchInstructionPackage, etc.).
Acceptance: Compiler passes; no circular imports; exported types used by loader & emitter.

### CDATool-cv3 Author 8 constraint markdown files
Purpose: Write markdown files each with frontmatter + 16 required sections (domain-no-imports-from-app-or-infra, etc.).
Acceptance: All files parse successfully; enforcement_order values reflect recommended sequential ordering.

### CDATool-m38 Implement constraintLoader.ts
Purpose: Parse constraint markdown, validate presence & ordering of 16 sections, construct ConstraintMeta + rich section maps.
Acceptance: Throws BUNDLE_ERROR on any missing section; returns sorted constraints by enforcement_order.

### CDATool-sbo Implement instructionEmitter.ts
Purpose: Transform parsed constraints into batch/single instruction packages (populate reportTemplate skeletons per spec).
Acceptance: Package objects conform to defined interfaces; keys match spec; deterministic ordering.

### CDATool-rjo Helper: runId generator
Purpose: Provide function generating ISO8601 timestamp + '-' + base36(6) per spec requirement.
Acceptance: Format validated by regex; tests confirm uniqueness across multiple invocations.

### CDATool-4ei Error taxonomy & exit codes
Purpose: Centralize error generation (FATAL, CONFIG_ERROR, BUNDLE_ERROR, IO_ERROR) with process exit mapping.
Acceptance: CLI commands emit appropriate exit code on simulated fault conditions.

### CDATool-oba CLI: cda init command
Purpose: Create `cda.config.json`, generate `CDA.md` (leveraging CDATool-he5 logic) and abort if config exists.
Acceptance: Re-run aborts with CONFIG_ERROR; initial run creates both files with required sections.

### CDATool-he5 Init: generate CDA.md content
Purpose: Assemble agent guide including workflow checklist + constraint summaries (objective, detection_steps, etc.).
Acceptance: Generated file includes all active constraints in recommended order.

### CDATool-qi3 CLI: cda list command
Purpose: Print constraint IDs + names + enforcementOrder.
Acceptance: Sorted output matches loader order; exit code 0.

### CDATool-beo CLI: cda describe <id>
Purpose: Render full authoritative sections relevant for agent consumption (objective/detection_steps/report_fields/etc.).
Acceptance: Unknown id yields CONFIG_ERROR or graceful error; valid id matches markdown content exactly.

### CDATool-pkz CLI: cda validate batch
Purpose: Emit instruction header + all constraint blocks + unified report template skeleton.
Acceptance: Includes recommended_order array; no actual code scanning; exit code 0.

### CDATool-i0q CLI: cda validate --constraint <id>
Purpose: Emit single constraint instruction package with sequential report template.
Acceptance: Unknown id error; valid output includes revalidatedZero flag in template.

### CDATool-llf Tests: parsing & packaging integrity
Purpose: Unit tests verifying mandatory sections, ordering, reportFields sync with markdown; negative missing section test.
Acceptance: All tests green; missing section fixture triggers expected error.

### CDATool-i04 Tests: snapshot instruction packages
Purpose: Snapshot batch & single packages (excluding volatile runId) to guard against structural regressions.
Acceptance: Snapshot stable across test runs; runId stripped or mocked.

### CDATool-9dl README: usage & agent workflow
Purpose: Document CLI commands, installation, agent interaction, expected outputs, zero violation philosophy.
Acceptance: Clear examples; references SPECIFICATION alignment; no TODO placeholders.

### CDATool-s2r Versioning & maintenance guidance
Purpose: Add doc section or file describing constraint version increment rules and regeneration process.
Acceptance: Matches SPECIFICATION section 21 & 20; instructs to re-run init on version changes.

## 6. Cross-Cutting Concerns
- Deterministic Sorting: Ensure stable sort comparator (enforcementOrder, then id fallback).
- Markdown Parsing Robustness: Strip code fences carefully; avoid accidental section merges.
- Validation Flexibility: Fail fast with descriptive error including offending constraint id.
- Test Isolation: Use fixture directory for malformed markdown case.

## 7. Risk Mitigations
- Ambiguous Sections: Enforce strict label matching (exact uppercase names).
- Drift Between Markdown & Emitter: Snapshot tests + direct string equality for reportFields.
- RunId Flakiness: Provide injection/mocking mechanism for tests.

## 8. Acceptance Checklist (End-to-End)
- init creates config + CDA.md
- list returns 8 constraints with correct enforcement orders
- describe prints expected sections for a sample constraint
- validate batch outputs all blocks + unified template
- validate single outputs targeted block + sequential template
- All markdown constraints load without error
- Test suite passes (unit + snapshots)
- README documents commands and workflow

## 9. Completion Criteria for Epic (CDATool-vs6)
All beads closed with successful test run and manual spot-check of CLI outputs; zero open high-priority tasks.

## 10. Follow-Up (Post-MVP1 Ideas)
- Regenerate command for CDA.md
- JSON output format flag
- Enable/disable constraints in config
- Audit mode validation

---
Plan stored under `history/` per AGENTS.md guidance.
