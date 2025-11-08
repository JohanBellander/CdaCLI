# Implementation Plan: Specification Update 2 (Agent-Agnostic Verification + Second-Person CDA.md)

## 1. Objective
Deliver the `cda agent` command, second-person `CDA.md` generation, agent config scaffolding, and supporting tests & docs exactly as defined in `SPECIFICATION_UPDATE2.md`, ensuring backward compatibility (`--legacy-format`) and deterministic verification prompt assembly.

## 2. Scope (Inclusions)
- New CLI command: `cda agent` (stdin execution path only).
- Agent config loader + validation (`cda.agents.json`).
- Prompt assembler with banner, metadata, preamble, instruction package, directive block, postscript, metrics.
- Second-person `CDA.md` generation in `cda init` (with acceptance hook checks optional for MVP).
- Echo agent support.
- Token estimation heuristic (chars / 4).
- Tests: config parsing, dry-run output structure, single vs batch, legacy format suppression, max_length enforcement, missing config fallback, echo agent, constraint selection.
- README documentation updates.
- Beads issues for each deliverable slice.

## 3. Scope (Exclusions / Non-Goals)
- No agent output parsing or automated compliance evaluation.
- No multi-agent chaining or alternative modes (`arg`, `file`).
- No environment variable interpolation inside agent config.
- No last-prompt automatic file unless `--output` passed.
- No semantic diff for existing `CDA.md` (overwrites entirely).

## 4. Deliverables
| Deliverable | Path | Description |
|-------------|------|-------------|
| Agent command | `src/cli/commands/agent.ts` | CLI flag parsing & execution orchestration. |
| Config module | `src/core/agentConfig.ts` | Read/validate `cda.agents.json`. |
| Prompt assembler | `src/core/promptAssembler.ts` | Build final prompt string from components. |
| CDA init enhancement | `src/cli/commands/init.ts` (patch) | Generate second-person `CDA.md` + agents config. |
| Tests | `tests/agent/*.test.ts` | Coverage for behaviors enumerated in spec. |
| Docs | `README.md` (section) | Usage examples & sample config. |
| Spec cross-ref | (existing) | Confirm final acceptance criteria updated. |

## 5. High-Level Sequence (Phases)
1. Foundation Setup (Config + Assembler stubs).
2. Instruction Reuse Wiring (Leverage existing validate emitters).
3. Agent Command Implementation (flags, prompt, dry-run, execution).
4. Init Command Enhancement (CDA.md second-person + agents file conditions).
5. Legacy Format Mode (suppress agent additions).
6. Testing Suite Buildout.
7. Documentation Update.
8. Final QA: dry-run examples, edge cases.
9. Version bump & release notes.

## 6. Detailed Task Breakdown
### Phase 1: Config & Assembler
- Implement `agentConfig.ts`:
  - Load JSON.
  - Validate required keys: `agents`, each agent `command`, `args[]`, `mode` in {stdin}, optional `max_length`, optional `prompt_preamble`, `postscript`.
  - Error codes: unknown agent, unsupported mode, invalid JSON.
- Implement `promptAssembler.ts`:
  - Export function assemblePrompt(options): returns string + metrics.
  - Insert banner, metadata (run_id, format version, agent_name, agent_model?, token_estimate_method).
  - Add preamble/postscript, directive block, metrics.

### Phase 2: Instruction Integration
- Reuse existing emitter used by `validate` to obtain batch or single constraint instruction package (no parsing inside agent).
- Ensure sentinel boundaries preserved.

### Phase 3: Agent Command
- Parse flags: `--constraint`, `--agent`, `--dry-run`, `--no-exec`, `--output`, `--legacy-format`.
- Resolve agent selection (default logic).
- Build prompt; enforce `max_length` before execution.
- Dry-run path prints prompt (and command unless `--no-exec`).
- Execution path spawns child process piping stdin.
- Error handling mapped to exit codes.

### Phase 4: Init Enhancements
- Generate second-person `CDA.md` using blueprint sections (7A.7). Overwrite if exists.
- Create `cda.agents.json` (copilot + echo) unless `--no-agents` or file exists.
- Add acceptance message summarizing created files.

### Phase 5: Legacy Format
- Add conditional branch in agent command to remove banner, directive block, metrics lines while retaining original instruction package.

### Phase 6: Tests
Test cases (Vitest):
1. Missing config: `cda agent --dry-run` prints instruction-only fallback.
2. Unknown agent: errors correctly.
3. Max length exceeded: error before output.
4. Dry-run full prompt: contains required sections and second-person directives.
5. Single constraint selection reduces package size.
6. Legacy format omits banner/metadata.
7. Echo agent dry-run prints correct metadata (agent_name echo).
8. Token estimation matches char count heuristic.
9. Constraint id not found triggers error.
10. No-exec prints prompt body only.

### Phase 7: Documentation
- README additions: Quick start for `cda agent`, sample config, echo agent usage, dry-run vs no-exec differences, legacy format rationale.
- Add "Spec Changes" section referencing instruction_format_version.

### Phase 8: QA & Verification
- Manual dry-run generation for batch + single constraint.
- Compare output against spec checklists (CDA.md blueprint compliance).
- Ensure no duplication of AGENT ACTION REQUIRED / directive block.

### Phase 9: Versioning & Release
- Increment minor version in package.json.
- Changelog entry summarizing new command, second-person playbook, backward compatibility flag.

## 7. Risks & Mitigations
| Risk | Mitigation |
|------|------------|
| Prompt size inflation | Early length check, user guidance to segment. |
| Ambiguous exit codes | Document mapping and centralize constants. |
| User confusion on legacy mode | Clear README comparison table. |
| Inadvertent overwrite of customized CDA.md | Warning message before overwrite (MVP optional). |
| Future mode expansion difficulty | Keep assembler modular with mode switch placeholder. |

## 8. Acceptance Criteria (Expanded)
- `cda agent --dry-run` shows second-person banner + directive + metrics.
- `cda agent --legacy-format --dry-run` shows only legacy instruction package (no banner/metrics/directives).
- Missing `cda.agents.json` yields graceful fallback text (no crash).
- Max length enforced with clear error.
- Echo agent recognized and functional.
- All test cases listed in Phase 6 pass (>=90% coverage of new code paths).
- `cda init` creates/overwrites `CDA.md` with every mandatory second-person section (7A.7).
- README documents flags and examples.
- Minor version bumped; changelog entry added.

## 9. Out-of-Scope Follow-Ups (To Bead as Future Tasks)
- Automatic parsing of agent output.
- Multi-agent chaining.
- File-mode/arg-mode prompt injection.
- Structured JSON output capture.
- Redaction layer.
- CDA.md compliance auto-check.

## 10. Work Estimates (Rough)
- Config loader + assembler: 4h
- Agent command + flags: 4h
- Init enhancements (CDA.md generator): 3h
- Tests (10 cases + fixtures): 5h
- Docs & README: 2h
- QA & refactor: 2h
Total ~20h (single dev), adjust if complexity emerges.

## 11. Implementation Ordering Justification
Config + assembler first avoids entangling exec logic. Command wiring afterwards reduces rework risk. Testing after stable prompt shape prevents brittle test churn.

## 12. Rollback Strategy
If agent command introduces instability, disable via feature flag `EXPERIMENTAL_AGENT=0` (optional environment check) and revert package minor version bump; keep second-person CDA.md (low risk) unless causing confusion.

---
## 13. Beads Mapping Overview
(See separate beads creation issues below for actionable tracking.)

- Epic: SPEC UPDATE 2 Implementation
- Features: Agent Command, Prompt Assembler, Init Enhancement, Legacy Mode, Test Suite, Documentation + Versioning
- Tasks: Per feature granular items (config validation, dry-run output, error codes, etc.)

---
End of implementation plan.
