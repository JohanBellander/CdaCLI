# Implementation Plan 2: Specification Update 1 (Validate Output Clarity)

Date: 2025-11-07
Related Spec: `SPECIFICATION_UPDATE1.md`
Epic Bead: CDATool-buk (Epic: Spec Update 1 - Validate Output Clarity)
Instruction Format Target Version: 2

## 1. Objective
Transform `cda validate` output so AI agents unambiguously treat it as an instruction package (not a validation result) by introducing explicit disclaimers, execution state flags, sentinel markers, action/negative blocks, expanded agent report skeleton, and audit-proof fields.

## 2. Guiding Principles
- Non-invasive: No code scanning added; performance O(c) retained.
- Deterministic: Formatting stable for snapshot tests; single occurrence of new markers.
- Explicit State: Output starts `execution_state: unvalidated` and `analysis_performed: false`.
- Agent Proof: Require counts and signature fields that must be populated post-execution.
- Minimal Friction: Avoid breaking existing internal tooling; optionally support legacy mode later.

## 3. Work Breakdown (Beads)
| Order | Bead ID | Title | Purpose | Priority |
|-------|---------|-------|---------|----------|
| 1 | CDATool-h10 | Validate header disclaimers & flags | Add top banner disclaimers and flags | 1 |
| 2 | CDATool-vw2 | instruction_format_version constant & plumbing | Introduce format version constant | 1 |
| 3 | CDATool-2is | Sentinel markers & section separation | Delimit instructions vs expected output | 1 |
| 4 | CDATool-m9r | AGENT ACTION REQUIRED & DO NOT blocks | Insert guidance & negative assertions | 1 |
| 5 | CDATool-a42 | Constraint header prefix 'INSTRUCTION ONLY' | Clarify per-block non-executed status | 2 |
| 6 | CDATool-6xf | Expanded agent report skeleton fields | Add new placeholders & structure | 1 |
| 7 | CDATool-c6u | Self-audit & success_conditions toggling | Add boolean proof fields | 1 |
| 8 | CDATool-1am | Snapshot & unit tests for new fields | Update/extend test suite | 1 |
| 9 | CDATool-6la | Update README and CDA.md disclaimer | Docs reflect instruction-only nature | 2 |
| 10 | CDATool-3oe | Optional legacy format flag (deferred) | Provide compatibility path if needed | 3 |

## 4. Sequencing & Dependencies
1. Header disclaimers (h10) & format version (vw2) first: base layer for all subsequent changes.
2. Sentinel markers (2is) and action/DO NOT blocks (m9r) – structural framing.
3. Constraint header prefixes (a42) after framing to ensure snapshots capture final structure.
4. Expanded skeleton (6xf) + success/audit fields (c6u) – content augmentation.
5. Tests (1am) once all structural and content fields added.
6. Docs (6la) after test pass to reflect final output.
7. Legacy flag (3oe) deferred unless consumer friction reported.

## 5. Detailed Tasks & Acceptance Criteria
### CDATool-h10 Header Disclaimers & Flags
- Insert banner lines (analysis_performed:false, execution_state: unvalidated, warning line, exit code note).
- Acceptance: Top lines appear exactly once; snapshot test coverage.

### CDATool-vw2 instruction_format_version
- Add constant `INSTRUCTION_FORMAT_VERSION = 2` exported.
- Print value in header.
- Acceptance: Present in output; tests assert number.

### CDATool-2is Sentinel Markers
- Add BEGIN/END markers for instruction and expected agent report format sections.
- Acceptance: Exactly one pair for each type; tests verify counts.

### CDATool-m9r Action & DO NOT Blocks
- Insert AGENT ACTION REQUIRED (numbered steps) & DO NOT block (bullets).
- Acceptance: Phrases present; no duplication.

### CDATool-a42 Constraint Header Prefix
- Prefix each block: `CONSTRAINT (INSTRUCTION ONLY – NO DETECTION YET): <id>`.
- Acceptance: All blocks show prefix; snapshot updated.

### CDATool-6xf Expanded Agent Report Skeleton
- Add fields: constraint_blocks_received, initial_violation_count, remaining_violation_count, revalidation_attempts_used, success_conditions, self_audit.*, agent_execution_signature, execution_state.
- Acceptance: Skeleton shows placeholders; tests assert keys & defaults (0, false, null).

### CDATool-c6u Self-Audit & Success Conditions
- Add boolean objects with false defaults; agent expected to flip post-validation.
- Acceptance: Keys present; defaults false.

### CDATool-1am Tests
- Update snapshot tests to reflect new header, markers, skeleton.
- Add unit tests for: presence of markers, absence of duplicates, field defaults, format version.
- Acceptance: All tests green; failing test identifies missing element if removed.

### CDATool-6la Docs
- README: Add updated validate output example with new fields & disclaimers.
- CDA.md: Add one-sentence disclaimer that validate emits instructions only.
- Acceptance: Docs updated; no outdated phrasing implying existing validation.

### CDATool-3oe Legacy Flag (Deferred)
- Add `--legacy-format` returning prior simpler output (without new fields/markers).
- Acceptance: Optional; implement only if requested.

## 6. Edge Cases & Considerations
- Multi-line formatting stability across Windows CRLF: ensure tests normalize line endings.
- Agent consuming only JSON: design future `--json` output (outside current scope) – mention in docs.
- Ensure no accidental inclusion of dynamic data (no file counts, no violation arrays) at emission stage.

## 7. Risks & Mitigations
| Risk | Mitigation |
|------|------------|
| Agents still misinterpret | Clear disclaimers + required execution_state transition fields |
| Snapshot churn annoyance | Consolidate markers; strict no extraneous whitespace near them |
| Future format evolution complexity | Introduce instruction_format_version now |
| Overly verbose output deters adoption | Keep wording concise; avoid repetition |
| Tests brittle on whitespace | Match markers via regex, not full-line equality |

## 8. Testing Strategy
- Snapshot of full batch output with placeholders.
- Unit test verifying counts of marker lines (==2 distinct markers).
- Unit test verifying field presence & defaults.
- Unit test verifying format version equals 2.
- Negative test: remove one marker → fails.

## 9. Rollback Strategy
If consumer agents break: revert to previous commit or ship `--legacy-format` flag quickly. The changes are additive; core logic untouched.

## 10. Completion Checklist
- [ ] All beads closed.
- [ ] Tests green & updated snapshots.
- [ ] README output example updated.
- [ ] CDA.md disclaimer added.
- [ ] instruction_format_version constant exported.
- [ ] No scanning logic added.

## 11. Post-Implementation Follow-Ups (Optional)
- Add `--json` emission mode.
- Implement audit mode verifying agent-populated report.
- Telemetry counters for agent compliance (opt-in).

## 12. Acceptance Definition (Epic)
Epic considered DONE when output reflects new format, docs updated, tests pass, and no regressions in existing commands.

---
Plan stored in `history/` per AGENTS.md guidance.
