---
id: optional-disabled
name: Optional Disabled Constraint
category: testing
severity: error
enabled: false
optional: true
version: 1
group: architecture
---

HEADER
constraint_id: optional-disabled
severity: error
enforcement_order: 3

PURPOSE
Optional constraint that is disabled by default.

SCOPE
Applies only when explicitly enabled.

DEFINITIONS
disabled: constraint is skipped unless overrides enable it

FORBIDDEN
- running without confirming activation

ALLOWED
- enabling via constraint_overrides.enabled true

REQUIRED DATA COLLECTION
targets: string[]

VALIDATION ALGORITHM (PSEUDOCODE)
detection_steps:
- run when active
- collect targets

REPORTING CONTRACT
keys: [constraint_id, status]

FIX SEQUENCE (STRICT)
1. align behavior with spec

REVALIDATION LOOP
Loop until state matches overrides.

SUCCESS CRITERIA (MUST)
- optional disabled constraints stay off unless enabled

FAILURE HANDLING
Warn configuration owners.

COMMON MISTAKES
- assuming disabled constraints still run

POST-FIX ASSERTIONS
- confirm toggle recorded

FINAL REPORT SAMPLE
report_kind: sample
