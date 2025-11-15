---
id: optional-enabled
name: Optional Enabled Constraint
category: testing
severity: error
enabled: true
optional: true
version: 1
group: architecture
---

HEADER
constraint_id: optional-enabled
severity: error
enforcement_order: 2

PURPOSE
Optional constraint that starts enabled.

SCOPE
Scoped to sample files only.

DEFINITIONS
optional: configuration may disable this constraint

FORBIDDEN
- ignoring optional flag semantics

ALLOWED
- using overrides to toggle behavior

REQUIRED DATA COLLECTION
records: string[]

VALIDATION ALGORITHM (PSEUDOCODE)
detection_steps:
- collect records
- evaluate constraints

REPORTING CONTRACT
keys: [constraint_id, reason]

FIX SEQUENCE (STRICT)
1. remediate optional paths

REVALIDATION LOOP
Repeat checks twice.

SUCCESS CRITERIA (MUST)
- zero optional violations

FAILURE HANDLING
Escalate to maintainer.

COMMON MISTAKES
- failing to document toggles

POST-FIX ASSERTIONS
- confirm toggled state noted

FINAL REPORT SAMPLE
report_kind: sample
