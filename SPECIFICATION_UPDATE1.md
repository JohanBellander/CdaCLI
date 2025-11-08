# CDA CLI Specification Update 1

Date: 2025-11-07
Version: 0.1.0+update1 (proposal)
Applies To: `cda validate` (batch & single constraint modes)
Status: PROPOSED (no implementation yet)

## 1. Problem Statement
External AI agents misinterpret the current output of `cda validate` as an already-executed validation result (i.e., "zero violations") instead of an **instruction package** describing how the agent itself must perform detection, remediation, and reporting.

Root causes:
- Ambiguous wording ("REPORT TEMPLATE" near constraint blocks).
- Lack of explicit state markers (no field indicating unvalidated state).
- No hard separation between instructions vs expected agent output.
- Exit code `0` gives false confidence that validation succeeded.
- Absence of mandatory agent-populated proof fields (file counts, attempts).

## 2. Goals
1. Make it unambiguous that the CLI performs **no source analysis** in MVP1.
2. Provide structural + textual cues that require agents to execute detection steps before emitting a final report.
3. Introduce placeholders that must be transformed by the agent (state transition) to assert real execution occurred.
4. Prevent premature declaration of success by requiring explicit counts & audit assertions.

## 3. Non-Goals
- Implement actual code scanning.
- Change constraint authoritative 16-section format.
- Introduce new validation heuristics or severity levels.
- Provide cryptographic attestation (future audit mode).

## 4. Scope of Changes
Applies only to the textual output and JSON skeleton emitted by `cda validate` (batch and single modes). No changes to constraint markdown files beyond optional header annotation.

## 5. High-Level Changes
| Area | Current | Proposed |
|------|---------|----------|
| Header | Plain banner | Add disclaimer + state + analysis flag |
| Instruction vs Output | Interleaved | Sentinel demarcated blocks |
| Template Label | "REPORT TEMPLATE" | "EXPECTED AGENT REPORT FORMAT" |
| Execution State | Implicit | `execution_state: unvalidated` (agent must output `validated` or `failed`) |
| Analysis Flag | Absent | `analysis_performed: false` |
| Action Guidance | Scattered in constraint content | Central "AGENT ACTION REQUIRED" block with numbered steps |
| Negative Assertions | Absent | Add DO NOT block to prevent shortcut interpretations |
| Proof Fields | Minimal | Add counts & audit fields (enumerated_files_count, constraint_blocks_received, revalidation_attempts_used) |
| Success Conditions | Implied | Explicit `success_conditions` object requiring agent toggling |
| State Transition Fields | None | Agent must set `agent_execution_signature`, booleans in `self_audit` |
| Sentinel Markers | None | `===== BEGIN CDA INSTRUCTIONS =====` / `===== END CDA INSTRUCTIONS =====` + output section |
| Field Renaming | Some ambiguous | Distinguish schema placeholders vs final agent report where needed |

## 6. Detailed Additions
### 6.1 Top Banner (Batch Mode)
```
CDA VALIDATION INSTRUCTION PACKAGE (MVP1)
analysis_performed: false
execution_state: unvalidated
INSTRUCTION PACKAGE ONLY — NO SOURCE ANALYSIS PERFORMED — AGENT MUST EXECUTE DETECTION STEPS
NOTE: CLI EXIT CODE 0 DOES NOT INDICATE ARCHITECTURAL COMPLIANCE.
```

Single mode adds: `mode: single` and constraint id line.

### 6.2 AGENT ACTION REQUIRED Block
Inserted immediately after banner:
```
AGENT ACTION REQUIRED:
  1. Do NOT assume zero violations.
  2. For EACH constraint block:
     a. Build REQUIRED DATA COLLECTION structures.
     b. Execute detection_steps exactly in order.
     c. Record initial violations BEFORE remediation.
     d. Apply FIX SEQUENCE strictly.
     e. Re-run detection (up to 2 attempts). If violations remain → mark status: failed.
  3. Populate the EXPECTED AGENT REPORT FORMAT.
  4. Set execution_state: validated (or failed) only after full loop.
  5. Include disputed violations rather than omitting them.
```

### 6.3 DO NOT Block
```
DO NOT:
- Omit required keys when arrays are empty.
- Declare success without enumerating all relevant files.
- Fabricate fixes_applied when there were zero initial violations.
- Skip revalidation when initial violations > 0.
- Remove constraint blocks from the final report.
```

### 6.4 Sentinel Markers
Wrap instruction vs expected output:
```
===== BEGIN CDA INSTRUCTIONS (TO EXECUTE) =====
... constraint blocks ...
===== END CDA INSTRUCTIONS =====
===== BEGIN EXPECTED AGENT REPORT FORMAT (FILL AFTER EXECUTION) =====
{ JSON skeleton }
===== END EXPECTED AGENT REPORT FORMAT =====
```

### 6.5 Per-Constraint Block Header Prefix
Change header:
```
CONSTRAINT (INSTRUCTION ONLY – NO DETECTION YET): <constraint_id>
```

### 6.6 Expected Agent Report Format (Batch)
New / updated skeleton:
```jsonc
{
  "report_kind": "cda_validation_result",
  "run_id": "<timestamp+random>",
  "execution_state": "unvalidated", // agent must change to validated or failed
  "analysis_performed": false,
  "summary": {
    "analyzed_files": 0, // agent-populated
    "constraints_evaluated": 0, // agent-populated
    "total_violations": 0 // agent-populated
  },
  "enumerated_files_count": 0,
  "constraint_blocks_received": <N>, // CLI sets N; agent must echo same integer
  "violations": [ /* agent-populated violation objects */ ],
  "fixes_applied": [],
  "initial_violation_count": 0, // agent sets after first detection
  "remaining_violation_count": 0, // agent sets after remediation loop
  "post_fix_status": { "revalidated": false, "remaining_violations": 0 },
  "revalidation_attempts_used": 0, // agent sets 1 or 2 if violations existed
  "success_conditions": { "all_constraints_evaluated": false, "no_remaining_violations": false },
  "self_audit": {
    "all_constraints_present": false,
    "all_required_fields_populated": false,
    "revalidation_attempts_documented": false,
    "schema_conformance": false
  },
  "agent_execution_signature": null, // agent must set to "executed-detection-and-remediation"
  "completion_timestamp": null,
  "status": null // or "failed" when remaining_violation_count > 0 after second attempt
}
```

Single mode skeleton parallels batch but omits aggregate summary in favor of constraint-focused keys.

### 6.7 Field Definitions
| Field | Description | Agent Responsibility |
|-------|-------------|----------------------|
| analysis_performed | Always false (MVP1) | Must echo unchanged |
| execution_state | Starts `unvalidated` | Must set `validated` or `failed` |
| constraint_blocks_received | Count of constraint blocks emitted | Must match; mismatch = audit failure |
| initial_violation_count | Violations before remediation | Populate integer |
| remaining_violation_count | Violations after remediation loop | Populate integer |
| revalidation_attempts_used | Number of post-fix detection reruns (1 or 2) | Populate integer |
| success_conditions | Booleans verifying global pass | Agent flips to true when criteria met |
| self_audit.* | Internal agent assertions | All must be true at successful completion |
| agent_execution_signature | Proof string | Must set exact value if full protocol executed |

### 6.8 Failure Semantics (Unchanged Logic, Enhanced Reporting)
- If `remaining_violation_count > 0` after second attempt: set `status: failed`, `execution_state: failed`, keep audit booleans reflecting incomplete success.
- Agent MUST still populate all counts.

### 6.9 Versioning Impact
- Tool semantic version remains 0.x; constraint versions unchanged.
- Add internal minor metadata: `instruction_format_version: 2` to header.
- Future changes increment this format version independent of tool semantic version.

### 6.10 Backwards Compatibility
- Previous output format deprecated but still acceptable behind `--legacy-format` flag (optional, deferred). Not required for this update; initial proposal assumes no legacy mode.

## 7. Acceptance Criteria
1. Running `cda validate` (batch) shows:
   - Banner with `analysis_performed: false` & `execution_state: unvalidated`.
   - Distinct sentinel markers delimiting instruction vs expected report.
   - AGENT ACTION REQUIRED block present before constraints.
   - DO NOT block present.
2. Per-constraint headers display the “INSTRUCTION ONLY” phrase.
3. Expected report skeleton includes new fields exactly as defined.
4. Single mode mirrors changes appropriately (constraint-specific).
5. README updated with a note clarifying instruction vs validation result.
6. Snapshot tests updated (excluding volatile run_id) reflecting sentinel markers & new fields.
7. No code scanning logic added; performance unchanged (O(c)).
8. Exit code remains 0 for successful emission of instructions.

## 8. Risks & Mitigations
| Risk | Mitigation |
|------|------------|
| Agents still ignore instructions | Mandatory proof fields & audit booleans force fill-in |
| Confusion from new fields | README + `cda describe` include short glossary additions |
| Output length growth | Acceptable; text-only; constraints count small (8) |
| Implementation drift from spec | Snapshot tests + instruction_format_version constant |

## 9. Testing Strategy (Update)
- Update snapshot baseline for batch & single validate outputs.
- Add unit test asserting presence & defaults of new fields.
- Add test verifying `constraint_blocks_received` equals length of emitted blocks.
- Negative test: simulate agent result missing `agent_execution_signature` → future audit mode (placeholder).

## 10. Rollout Plan
1. Implement format changes behind no flag (default new format).
2. Update README and CDA.md generation (only referencing changed validate output semantics; CDA.md itself may add a brief instruction disclaimer but remains authoritative for constraints).
3. Bump `instruction_format_version` constant.
4. Commit with message: `feat(validate): clarify instruction-only emission (spec update 1)`.

## 11. Future Extensions (Not Part of This Update)
- `--json` direct machine schema output.
- Audit mode verifying agent-populated report against real file system heuristics.
- Telemetry counters of agent compliance (opt-in).

## 12. Open Questions
- Do we want a `dry_run_explanation: true` field for enhanced agent clarity? (Optional)
- Should we enforce presence of `violations` array even when empty (current spec: yes)? Confirm.
- Are disputed violations used enough to warrant example expansion here?

## 13. Glossary Additions
- **instruction_format_version**: Monotonically incremented integer representing structural format changes of `validate` output.
- **execution_state**: Lifecycle field transitioning from `unvalidated` → `validated` or `failed` exclusively by agent.
- **agent_execution_signature**: Fixed token set by agent when it attests to having performed full detection-remediation loop.

---
End of Specification Update 1.
