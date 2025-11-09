---
id: mandatory-default
name: Mandatory Default Constraint
category: testing
severity: error
enabled: true
version: 1
---

HEADER
constraint_id: mandatory-default
severity: error
enforcement_order: 1

PURPOSE
This constraint is mandatory and cannot be disabled.

SCOPE
Apply to every file in the repository.

DEFINITIONS
mandatory: constraint cannot be toggled off

FORBIDDEN
- skipping enforcement steps

ALLOWED
- running every documented step

REQUIRED DATA COLLECTION
files_analyzed: string[]

VALIDATION ALGORITHM (PSEUDOCODE)
detection_steps:
- enumerate files
- enforce constraint

REPORTING CONTRACT
keys: [constraint_id, file_path]

FIX SEQUENCE (STRICT)
1. update offending files

REVALIDATION LOOP
Rerun detection until clean.

SUCCESS CRITERIA (MUST)
- all files comply

FAILURE HANDLING
Escalate to architecture owner.

COMMON MISTAKES
- assuming optional state

POST-FIX ASSERTIONS
- rerun prompts

FINAL REPORT SAMPLE
report_kind: sample
