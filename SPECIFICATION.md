# CDA CLI Tool Specification (MVP1)

## 1. Overview
The `cda` CLI (MVP1) does NOT parse or analyze the project's source code directly. Instead, it emits authoritative, deterministic instruction packages derived from bundled Constraint-Driven Architecture (CDA) constraint markdown files. An external AI agent consumes these instructions, performs validation and remediation, and produces reports that follow strict schemas. The CLI's responsibility in MVP1 is limited to: initialization (`cda init`), listing & describing constraints, and producing instruction packages (`cda validate`). Zero violations are required for the agent to declare success.

## 2. Goals (MVP1)
- Provide immediate architectural feedback (layer, size, naming, structure).
- Zero project pollution beyond `cda.config.json` and `CDA.md` (created by `cda init`).
- Low dependency footprint (TypeScript compiler only + Node built-ins).
- AI-agent readable, strictly structured instruction packages for automated correction cycles.
- Simple deterministic constraint definitions; the tool performs no repository code heuristics in MVP1.

## 3. Non-Goals (Deferred)
- Duplicate code detection.
- Constraint enable/disable toggling.
- Parameter overrides / thresholds config.
- JSON/Markdown alternative output formats.
- Watch mode / incremental caching.
- Constraint marketplace / remote fetching.
- Multi-language adapters.
- Severity levels beyond `error`.
- Performance caching.

## 4. Runtime Environment
- Node.js >= 18 (for native fetch & modern APIs).
- Cross-platform (Windows, macOS, Linux). Tested minimally in Node 18+.

## 5. Directory & Package Structure (Internal – Instruction Mode Only)
```
/ (package root)
├─ package.json
├─ tsconfig.json
├─ src/
│  ├─ cli/
│  │  └─ index.ts                 # Entry point / command router
│  ├─ core/
│  │  ├─ constraintLoader.ts      # Loads & validates authoritative markdown sections
│  │  ├─ instructionEmitter.ts    # Builds instruction packages (batch / single)
│  │  └─ types.ts                 # Shared TypeScript interfaces (instruction-focused)
│  ├─ constraints/                # Bundled constraint markdown (NOT copied to target project)
│  │  ├─ core/
│  │  │  ├─ domain-no-imports-from-app-or-infra.md
│  │  │  ├─ app-no-imports-from-infra.md
│  │  │  ├─ domain-no-side-effects.md
│  │  │  ├─ max-file-lines.md
│  │  │  ├─ single-responsibility.md
│  │  │  ├─ file-naming.md
│  │  │  ├─ folder-naming.md
│  │  │  └─ excessive-nesting.md
├─ SPECIFICATION.md               # (This file)
└─ README.md                      # High-level usage (agent consumption overview)
```
Internal focus only includes files shown above; no runtime code scanning modules are part of MVP1.

## 6. Constraint Markdown Format
Each constraint markdown file contains frontmatter followed immediately by a single authoritative template consisting of 16 required sections. Optional informational sections (e.g., `Examples`) MAY appear after these required sections provided they introduce no new required keys.

Frontmatter example:
```
---
id: max-file-lines
name: Maximum File Lines
category: file-constraints
severity: error
enabled: true
version: 1
---
```

Immediately after frontmatter begins the ordered authoritative sections starting with `HEADER`.

### 6.1 Authoritative Constraint Template
Every bundled constraint MUST implement these 16 labeled sections in order inside its markdown after frontmatter and title. Sections omitted are a packaging error. The agent consumes this authoritative form.

Ordered Sections (All Required):
1. HEADER – `constraint_id`, `severity`, `enforcement_order` (ordinal; lower runs earlier).
2. PURPOSE – Single MUST statement (normative requirement).
3. SCOPE – `include_paths`, `exclude_paths` explicit patterns.
4. DEFINITIONS – Precise machine-level definitions (e.g., layer classification rules).
5. FORBIDDEN – Bulleted list of disallowed patterns/tokens.
6. ALLOWED – Bulleted list of permitted edge cases/exceptions.
7. REQUIRED DATA COLLECTION – Names of in-memory structures agent MUST build (snake_case) before evaluation.
8. VALIDATION ALGORITHM (PSEUDOCODE) – Deterministic pseudo-code block; MUST reference required data structures.
9. REPORTING CONTRACT – Exact required keys per violation object; ordering rules; no extra keys clause.
10. FIX SEQUENCE (STRICT) – Ordered remediation steps; agent MUST follow exactly.
11. REVALIDATION LOOP – Algorithm including iteration cap (currently 2 attempts).
12. SUCCESS CRITERIA (MUST) – Boolean assertions required for pass.
13. FAILURE HANDLING – Protocol when pass fails (e.g., emit blocking report, escalate unknown classification).
14. COMMON MISTAKES – Bullet list to prevent incorrect remediation.
15. POST-FIX ASSERTIONS – Cross-constraint invariants agent MUST verify after fixes.
16. FINAL REPORT SAMPLE – Minimal valid JSON-like example demonstrating all required fields.

Field Naming Rules:
- Data structure names: snake_case.
- JSON report keys: lowerCamelCase except `constraint_id` preserved.
- Boolean success flags: suffix `_zero` or `_status`.
- Time fields: ISO8601 string.

Revalidation Cap:
- Attempt limit fixed at 2 in MVP1; future versions may allow config.

Failure Protocol:
- If violations remain after second attempt → agent MUST emit report with `status: failed` (additional key allowed only in failure) and halt further constraint progression until human intervention.

Initial Violation Accounting:
- Each initial violation MUST correspond to one entry in `fixes_applied`; agent may merge identical fixes (e.g., bulk refactor) but MUST reference all affected files.

False Positive Handling:
- If agent believes a violation is a false positive it MUST still list it under `violations` with an added `disputed: true` key and rationale field `dispute_reason` (future optional; not enforced in MVP1 output parsing).

Example Authoritative Template Block (Constraint: domain-no-imports-from-app-or-infra):
```
HEADER
constraint_id: domain-no-imports-from-app-or-infra
severity: error
enforcement_order: 1

PURPOSE
Domain layer MUST NOT import code from app or infra layers.

SCOPE
include_paths: any file path containing '/domain/'
exclude_paths: ["node_modules","dist","build",".git"]

DEFINITIONS
layer(domain): file path contains '/domain/' segment
layer(app): contains '/app/' segment
layer(infra): contains '/infra/' segment
layer(external): bare module specifier without leading './' or '../'
layer(unknown): resolution fails or path outside project root

FORBIDDEN
- Import classified as app
- Import classified as infra

ALLOWED
- Imports classified as domain
- Imports classified as external
- Type-only imports from external packages

REQUIRED DATA COLLECTION
files_domain: string[]
imports_by_file: Record<string, { line: number; specifier: string }[]>
violations_initial: ViolationRecord[]

VALIDATION ALGORITHM (PSEUDOCODE)
```
files_domain = findFiles('/domain/')
for file in files_domain:
    imports = parseImports(file)
    for imp in imports:
        layer = classifyLayer(imp.specifier, file)
        if layer in ['app','infra']:
            violations_initial.append({
                constraint_id: 'domain-no-imports-from-app-or-infra',
                file_path: file,
                line: imp.line,
                specifier: imp.specifier,
                resolved_layer: layer
            })
initial_violation_count = len(violations_initial)
assert initial_violation_count >= 0
```

REPORTING CONTRACT
Violation object REQUIRED keys (exactly): constraint_id, file_path, line, specifier, resolved_layer
Ordering: sort by file_path ASC then line ASC
No extra keys (except `disputed`, `dispute_reason` when a violation is contested)

FIX SEQUENCE (STRICT)
1. Determine nature: orchestration vs external interaction.
2. Move orchestration to app OR external interaction to infra.
3. Introduce domain interface where domain previously depended directly.
4. Update domain imports to consume interface.
5. Append textual remediation entry to fixes_applied.

REVALIDATION LOOP
```
for attempt in 1..2:
    rerun VALIDATION ALGORITHM -> violations_after
    if len(violations_after) == 0: break
if len(violations_after) > 0:
    status = 'failed'
```

SUCCESS CRITERIA (MUST)
- len(violations_after) == 0
- Each initial violation referenced in fixes_applied
- revalidated_zero == true

FAILURE HANDLING
If len(violations_after) > 0 after second attempt: emit report with status: failed; stop sequential progression.
If any layer == unknown: set human_review_required: true.

COMMON MISTAKES
- Moving pure domain logic unnecessarily
- Wrapping infra import with thin adapter but keeping direct dependency

POST-FIX ASSERTIONS
- No domain file imports '/app/' or '/infra/'
- Newly added or split files comply with single-responsibility & max-file-lines

FINAL REPORT SAMPLE
```
{
  "constraint_id": "domain-no-imports-from-app-or-infra",
  "violations": [
    {
      "constraint_id": "domain-no-imports-from-app-or-infra",
      "file_path": "src/domain/OrderCalculator.ts",
      "line": 11,
      "specifier": "../app/OrderCoordinator",
      "resolved_layer": "app"
    }
  ],
  "fixes_applied": [
    "Moved orchestration to src/app/OrderCoordinator.ts; introduced IOrderCoordinator interface."
  ],
  "revalidated_zero": true,
  "completion_timestamp": "2025-11-07T12:55:10Z"
}
```
```

All other constraints MUST mirror this authoritative format with domain-specific adjustments to FORBIDDEN, ALLOWED, DATA COLLECTION, ALGORITHM, and ASSERTIONS.

## 7. Active Constraints (MVP1)
1. domain-no-imports-from-app-or-infra
2. app-no-imports-from-infra
3. domain-no-side-effects
4. max-file-lines
5. single-responsibility
6. file-naming
7. folder-naming
8. excessive-nesting

All are always enabled in MVP1.

## 8. Validation Model (Instruction Mode)
In MVP1 the CLI does not perform static code analysis. Instead it emits deterministic instruction packages the AI agent follows to self-validate each constraint. The previously defined heuristics become agent-executed procedures rather than tool logic.

### 8.1 Batch vs Sequential Modes
Two usage patterns are supported:
- Batch (default): `cda validate` emits instructions for ALL active constraints in one package.
- Sequential (recommended for reliability): Run constraints one at a time in the prescribed order using `cda validate --constraint <id>` or `cda validate --sequential` (alias for the first).

### 8.2 Recommended Sequential Ordering
1. domain-no-imports-from-app-or-infra
2. app-no-imports-from-infra
3. domain-no-side-effects
4. max-file-lines
5. single-responsibility
6. excessive-nesting
7. file-naming
8. folder-naming

This ordering minimizes rework (architectural purity before structural splits; naming last to avoid repetitive renames).

### 8.3 Instruction Package Structure
Each constraint block contains:
| Field | Purpose |
|-------|---------|
| constraint_id | Unique identifier |
| objective | One-sentence enforcement goal |
| detection_steps | Ordered, explicit steps for agent to execute |
| report_fields | Required keys agent must output per violation |
| pass_criteria | Boolean conditions for success |
| fix_strategy | Single-line remediation summary |
| self_verification_checklist | Completion gate items |

### 8.3.1 Agent Execution Intro (Normative)
Upon receiving a `cda validate` instruction package the AI agent MUST:
1. Parse and verify package structure (run_id, mode, order, constraints, report template).
2. Iterate constraints in enforcement_order.
3. For each constraint: build REQUIRED DATA COLLECTION structures first; detect all violations (no fixes yet); then apply FIX SEQUENCE verbatim; re-run detection (and a second time only if violations persist); halt progression if violations remain after second attempt.
4. Re-check prior constraints if any fix modified earlier files; remediate regressions immediately.
5. Assemble violations using ONLY declared report_fields (+ optional disputed, dispute_reason) preserving specified ordering.
6. Provide one descriptive fixes_applied entry per initial violation (aggregated multi-file entries allowed but must reference all affected paths).
7. Include disputed violations rather than omitting them.
8. Ensure deterministic output: identical code + instructions ⇒ identical violation ordering/counts.
9. Run a self-audit: confirm success criteria and schema integrity before emitting final report.
Failure to follow any step above constitutes a failed run even if zero violations are reported.

### 8.4 Unified Report Template (Batch)
After executing all detection steps the agent produces a JSON-like report:
```
{
  "run_id": "<timestamp+random>",
  "summary": {"analyzed_files": <int>, "constraints_evaluated": <int>, "total_violations": <int>},
  "violations": [
    {"constraint_id": "max-file-lines", "file_path": "src/app/UserService.ts", "line_start": 1, "line_end": 326, "message": "File exceeds 300 lines", "suggested_action": "Split by responsibility"}
  ],
  "fixes_applied": ["Split UserService.ts into UserReadService.ts, UserWriteService.ts"],
  "post_fix_status": {"revalidated": true, "remaining_violations": <int>}
}
```
Success requires `remaining_violations = 0`.

### 8.5 Sequential Report Schema (Per Constraint)
```
{
  "constraint_id": "domain-no-imports-from-app-or-infra",
  "violations": [ {"file_path": "src/domain/OrderCalculator.ts", "line": 11, "import_specifier": "../app/OrderCoordinator", "resolved_layer": "app"} ],
  "fixes_applied": ["Moved orchestration to src/app/OrderCoordinator.ts"],
  "revalidated_zero": true,
  "completion_timestamp": "2025-11-07T12:05:31Z"
}
```

### 8.6 Agent Execution Guarantees
The agent MUST:
1. Enumerate all relevant files before declaring zero violations.
2. Record violations BEFORE applying fixes.
3. Apply fixes consistent with each constraint's Agent Enforcement Protocol.
4. Re-run detection steps to ensure zero residual violations.
5. Produce the required report structure faithfully (keys present, correct types).

### 8.7 Future Audit Mode (Out of Scope Now)
`cda review <report>` will later parse and optionally spot-check filesystem consistency to verify agent claims.

### 8.8 Underlying Rule Concepts
Conceptual rule domains represented across constraints: layer purity (domain/app/infra boundaries), side-effect avoidance, maximum file size, single responsibility (export count), structural simplicity (nesting depth), and consistent naming (files & folders). These concepts are enforced solely through the emitted constraint instructions; the CLI performs no direct analysis.

## 9. Output Format (Instruction Mode)
`cda validate` prints an instruction header, then ordered constraint blocks, then a unified report template. No violation counts are shown (tool does not inspect code). Exit code: 0 unless internal fatal error.

Header example:
```
CDA VALIDATION INSTRUCTION PACKAGE
run_id: 2025-11-07T12:05:31Z
mode: batch
recommended_order: [domain-no-imports-from-app-or-infra, app-no-imports-from-infra, domain-no-side-effects, max-file-lines, single-responsibility, excessive-nesting, file-naming, folder-naming]
ignored_paths: ["node_modules", "dist", "build", ".git"]
```

Constraint block example (truncated):
```
CONSTRAINT: max-file-lines
objective: Maintain files ≤ 300 logical lines.
detection_steps:
  1. List all .ts/.tsx excluding ignored paths.
  2. Count logical lines per file (exclude blank/comment lines).
  3. Record any file > 300.
report_fields: [file_path, line_start, line_end, logical_line_count]
pass_criteria: No file exceeds 300 logical lines.
fix_strategy: Split by responsibility; keep ≤ 3 exports per new file.
self_verification_checklist:
  - □ All oversized files split.
  - □ Recount confirms ≤ 300.
```

Footer example:
```
REPORT TEMPLATE FOLLOWS — GENERATE AND RETURN AFTER FULL VALIDATION.
Zero violations required to proceed.
```

## 10. CLI Commands (Updated)
- `cda init`
  - If `cda.config.json` exists → abort.
  - Creates `cda.config.json` and `CDA.md` (includes AEP + workflow + recommended ordering).
- `cda list`
  - Prints constraint IDs + names + recommended ordinal.
- `cda describe <id>`
  - Prints meta + full Agent Enforcement Protocol + required report_fields.
- `cda validate`
  - Emits batch instruction package (all constraints).
- `cda validate --constraint <id>`
  - Emits instruction package for just that constraint (sequential manual step).
- `cda validate --sequential`
  - Alias for first constraint in recommended order.

## 11. Generated Files by Init
### 11.1 cda.config.json
```
{ "version": 1, "constraints": "builtin" }
```
### 11.2 CDA.md (Agent Guide)
Contents:
- Brief CDA overview.
- Workflow checklist (authoritative, constraint-driven).
- Constraint quick reference list (IDs + names).
- Section `## Constraint Enforcement Protocols` containing each active constraint's AEP content in order shown by `cda list`.
- Emphasis: ZERO violations accepted.

Injection Structure Example:
```
## Constraint Enforcement Protocols

### max-file-lines
<Agent Enforcement Protocol content>

### domain-no-side-effects
<Agent Enforcement Protocol content>
```
All always-enabled constraints are included in MVP1. Future versions will respect enable/disable toggles.

### 11.3 CDA.md Workflow Checklist (Authoritative Text)
Final wording injected under `## Workflow Checklist`:
```
1. Run `cda validate` BEFORE writing any code; baseline must show 0 violations.
2. PLAN every intended file change explicitly against ALL active constraints (layer, purity, size, naming, exports, nesting).
3. IMPLEMENT only changes that satisfy ALL constraints simultaneously—do not defer violations.
4. IF a violation appears during implementation, STOP and refactor immediately (no partial compliance).
5. RUN `cda validate` after implementation; output must show 0 violations.
6. REMEDIATE every reported violation using its Agent Enforcement Protocol; re-run until clean.
7. ONLY AFTER zero violations: proceed to tests, review, or commit.
```

## 12. Internal Types (Instruction Emission Focus)
```
interface ConstraintMeta {
  id: string;
  name: string;
  category: string;
  severity: 'error';
  enabled: boolean; // always true in MVP1
  version: number;
  enforcementOrder: number; // from HEADER section
}

interface InstructionConstraintBlock {
  constraintId: string;
  enforcementOrder: number;
  objective: string;
  detectionSteps: string[];
  reportFields: string[];
  passCriteria: string; // text describing success condition
  fixStrategy: string; // concise remediation summary
  selfVerificationChecklist: string[]; // checkbox items
}

interface BatchReportTemplate {
  summary: { analyzedFiles: number; constraintsEvaluated: number; totalViolations: number };
  violations: Array<Record<string, unknown>>;
  fixesApplied: string[];
  postFixStatus: { revalidated: boolean; remainingViolations: number };
}

interface SequentialReportTemplate {
  constraintId: string;
  violations: Array<Record<string, unknown>>;
  fixesApplied: string[];
  revalidatedZero: boolean;
  completionTimestamp: string;
  status?: 'failed';
}

interface BatchInstructionPackage {
  runId: string;
  mode: 'batch';
  recommendedOrder: string[];
  ignoredPaths: string[];
  constraints: InstructionConstraintBlock[];
  reportTemplate: BatchReportTemplate;
}

interface SingleInstructionPackage {
  runId: string;
  mode: 'single';
  constraint: InstructionConstraintBlock;
  reportTemplate: SequentialReportTemplate;
}
```

## 13. Testing Strategy
Focus shifts from heuristic correctness to instruction integrity.
- Framework: `vitest`.
- Tests ensure: (a) all 16 sections parsed, (b) ordering by `enforcementOrder` stable, (c) emitted `reportFields` match Reporting Contract in markdown, (d) batch vs single mode packaging differences.
- Negative tests: missing required section triggers BUNDLE_ERROR.
- Snapshot tests: instruction package structure (excluding volatile `runId`).
- No source code scanning tests (deferred until audit mode).

## 14. Error Handling
- Malformed constraint markdown (missing any of 16 required sections) → BUNDLE_ERROR (exit 1).
- Missing `cda.config.json` for non-init commands → CONFIG_ERROR (exit 1).
- Internal unexpected exception → FATAL (exit 1).
- Non-critical optional keys ignored silently (future verbose flag may list).

## 15. Performance Considerations (MVP1)
Instruction emission only reads bundled markdown + minimal config. Complexity O(c) where c = number of constraints. No repository file traversal. Performance issues negligible.

## 16. Security Considerations
- Does not execute user code.
- Treats file system paths literally (no network calls).
- Avoid reading `.env` or secrets; only file names + content.

## 17. Future Extensions (Out of Scope Now)
- JSON output (`--format=json`).
- Enable/disable per constraint in config.
- Threshold overrides (e.g., max lines).
- Duplicate code detection via hashing.
- Multi-language support (Python, Go, etc.).
- VS Code extension integration.
- Git hook quick installer.
- AI-assisted auto-fix proposals.

## 18. Acceptance Criteria (MVP1 Instruction Mode)
- Running `cda init` creates `cda.config.json` + `CDA.md` embedding authoritative template summaries in recommended order.
- `cda list` displays 8 constraints with their `enforcementOrder`.
- `cda describe <id>` renders parsed authoritative sections (objective, detection_steps, report_fields, pass_criteria, fix_strategy, self_verification_checklist).
- `cda validate` outputs batch instruction package + unified report template (no code scanning).
- `cda validate --constraint <id>` outputs single instruction block + per-constraint report template.
- Internal types reflect instruction emission only.
- Test suite verifies presence/format of instruction blocks and schema integrity.

## 19. Risks
- Ambiguous or poorly specified constraint sections could lead to divergent agent interpretations.
- Agent implementation defects may produce non-conformant reports (mitigated by strict schema + future audit mode).
- Stale `CDA.md` after constraint version bumps could mislead agents (mitigated by regeneration guidance).
- Overly rigid FIX SEQUENCE might cause excessive refactoring churn in complex legacy codebases.

## 20. Maintenance
- Adding a constraint requires: new markdown file with complete 16-section template + unique `enforcement_order`.
- After adding or modifying a constraint (version increment), regenerate `CDA.md` via re-running `cda init` (future dedicated regenerate command may be added).
- Keep `enforcement_order` contiguous; gaps are allowed but discouraged (ordering display sorts numerically).
- Constraint frontmatter `version` increments on any change to FORBIDDEN, VALIDATION ALGORITHM, REPORTING CONTRACT, or SUCCESS CRITERIA.

---
## 21. Versioning & Stability
Tool semantic versioning starts at `0.1.0` for MVP1 (instruction mode). Rules:
- Minor version MAY add new constraints or optional fields (non-breaking).
- Major version change REQUIRED if: removing a required report field, reordering enforcement_order, altering required sections, or changing pass_criteria semantics.
- Constraint frontmatter `version` MUST increment when any FORBIDDEN or VALIDATION ALGORITHM logic changes.
- Regenerating `CDA.md` SHOULD occur when tool version or any constraint version changes.

## 22. Error Taxonomy
Runtime errors use prefixes; exit code = 1:
- FATAL: Irrecoverable internal state (missing bundled constraints).
- CONFIG_ERROR: Invalid or unreadable `cda.config.json` (MVP1 minimal; reserved).
- BUNDLE_ERROR: Constraint markdown missing required authoritative sections.
- IO_ERROR: File system read failure for critical bundled resource.
Non-critical issues (e.g., unknown optional section) are logged but do not alter exit code.

## 23. Report Schema (Types Reference)
| Key | Type | Required | Notes |
|-----|------|----------|-------|
| run_id | string | yes | Format: ISO8601 + '-' + base36(6) |
| summary.analyzed_files | number | yes | >= 0 |
| summary.constraints_evaluated | number | yes | = active constraint count |
| summary.total_violations | number | yes | = violations.length |
| violations[] | array | yes | May be empty if zero |
| violations[].constraint_id | string | yes | Must match loaded constraint id |
| violations[].file_path | string | yes | Relative path |
| violations[].line_start | number | conditional | Present for line-based violations |
| violations[].line_end | number | conditional | Inclusive; may equal line_start |
| violations[].message | string | yes | Human + agent actionable |
| violations[].suggested_action | string | yes | Imperative fix hint |
| violations[].disputed | boolean | optional | Only if agent flags false positive |
| violations[].dispute_reason | string | optional | From dispute vocabulary |
| fixes_applied[] | array<string> | conditional | Required if initial violations > 0 |
| post_fix_status.revalidated | boolean | yes | True if second pass executed |
| post_fix_status.remaining_violations | number | yes | Must be 0 for success |
| status | string | optional | Present only on failure: 'failed' |
| completion_timestamp | string | recommended | ISO8601 |

## 24. Sequential Validation & Regression Rule
When using per-constraint validation (`--constraint`):
- Agent MUST follow enforcement_order.
- After completing a constraint and applying fixes, the agent SHOULD opportunistically re-check all previously passed constraints if files they touched were modified.
- Regression Rule: If a previously passed constraint would now fail, agent MUST repair before proceeding to next enforcement_order.

## 25. Trust Model & Audit Mode Roadmap
MVP1 trusts agent-generated reports without verification. No cryptographic integrity or filesystem cross-checks are performed.
Roadmap (Audit Mode):
- `cda review <report>` will parse report, recompute selected heuristics (layer imports, file length) and ensure congruence.
- Fail conditions: mismatch in total_violations, missing required fields, contradictory success criteria.
Until audit mode exists, CI SHOULD treat reports as advisory; human or automated spot-check recommended for first two constraints (layer purity & side-effects).

## 26. False Positive Dispute Vocabulary
Accepted `dispute_reason` values (future enforcement):
- generated – Code auto-generated and excluded from normal constraints.
- transitional – Temporary file pending scheduled refactor.
- tooling – Build or configuration artifact.
- legacy_refactor_pending – Legacy debt scheduled for separate task.
Agent MUST include disputed violations in the violations array (not omit) even if disputing.

## 27. Reserved Frontmatter Keys & Extensions
Frontmatter reserved for future use:
- deprecated: boolean (signals constraint will be removed)
- supersedes: string (id of prior constraint replaced)
- tags: string[] (categorization, search)
- audit_level: 'full' | 'partial' | 'none'
MVP1 ignores these if present.

## 28. Glossary (Abbreviated)
- Domain: Pure business logic layer—no external side-effects.
- App (Application): Orchestration layer coordinating domain services & user/system interactions without direct infra access.
- Infra (Infrastructure): Layer for external systems (DB, HTTP, FS, APIs).
- Orchestration: Combining discrete domain operations into a use case flow.
- Purity: Absence of non-deterministic or external interactions.
- Responsibility Unit: Cohesive cluster of logic justifying a file’s existence.
- Adapter: infra implementation fulfilling a domain/app interface.
- Violation: Any recorded deviation from FORBIDDEN rules or pass_criteria.

---
End of SPECIFICATION for MVP1.
