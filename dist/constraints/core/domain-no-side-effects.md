---
id: domain-no-side-effects
name: Domain Must Remain Pure
category: purity
severity: error
enabled: true
version: 1
group: architecture
---

HEADER
constraint_id: domain-no-side-effects
severity: error
enforcement_order: 3

PURPOSE
Domain logic MUST remain deterministic and side-effect free.

SCOPE
include_paths: any file path containing '/domain/'
exclude_paths: ["node_modules","dist","build",".git"]

DEFINITIONS
side_effect_call: function that performs IO (fs, http, process, console, timers, randomness)
impure_global: mutable value defined outside a function scope and reassigned
clock_access: direct call to Date.now or new Date without dependency injection

FORBIDDEN
- Invoking fs, http, net, child_process, or database SDKs directly
- Reading or mutating process.env or globalThis
- Writing to console.* for logging or tracing
- Using setTimeout, setInterval, or random generators inline

ALLOWED
- Pure computations, aggregations, and validation logic
- Accessing injected collaborators that encapsulate side effects
- Creating value objects and domain events

REQUIRED DATA COLLECTION
domain_files: string[]
call_sites_by_file: Record<string, { line: number; expression: string }[]>
global_mutations: { file_path: string; line: number; identifier: string }[]
violations_initial: ViolationRecord[]

VALIDATION ALGORITHM (PSEUDOCODE)
detection_steps:
- Enumerate domain files.
- Scan call expressions for known side-effect APIs (fs, process, console, timers, randomness).
- Detect mutable globals or clock access performed without injection.
```
domain_files = findFiles('/domain/')
for file in domain_files:
    ast = parseFile(file)
    call_sites = findCallExpressions(ast)
    for call in call_sites:
        if referencesSideEffectAPI(call):
            violations_initial.append({
                constraint_id: 'domain-no-side-effects',
                file_path: file,
                line: call.line,
                expression: call.text,
                reason: 'side_effect_call'
            })
    globals = findMutableGlobals(ast)
    for node in globals:
        violations_initial.append({
            constraint_id: 'domain-no-side-effects',
            file_path: file,
            line: node.line,
            expression: node.identifier,
            reason: 'global_mutation'
        })
```

REPORTING CONTRACT
Violation object REQUIRED keys: constraint_id, file_path, line, expression, reason. Ordering: file_path ASC, reason ASC, line ASC. Optional keys: disputed, dispute_reason.

FIX SEQUENCE (STRICT)
1. Classify violation as IO, logging, timing, randomness, or global mutation.
2. Extract the side effect behind an interface owned by app/infra.
3. Inject the interface through function parameters or constructor boundaries.
4. Replace direct usage with injected collaborator.
5. Update tests to cover deterministic behavior and note fix in fixes_applied.

REVALIDATION LOOP
```
for attempt in 1..2:
    violations_after = rerun VALIDATION ALGORITHM
    if len(violations_after) == 0:
        break
if len(violations_after) > 0:
    status = 'failed'
```

SUCCESS CRITERIA (MUST)
- violations list empty.
- Domain files only depend on injected collaborators for side effects.
- revalidated_zero equals true.

FAILURE HANDLING
If impure calls remain after attempt 2, emit status: failed and halt further constraints until resolved.

COMMON MISTAKES
- Keeping console.log for debugging in domain services.
- Reading environment variables directly inside domain objects.
- Using Date.now inside aggregate logic rather than injecting a clock.

POST-FIX ASSERTIONS
- Each side-effectful concern lives in app or infra.
- Domain tests run deterministically without stubs that hit IO.

FINAL REPORT SAMPLE
```
{
  "constraint_id": "domain-no-side-effects",
  "violations": [
    {
      "constraint_id": "domain-no-side-effects",
      "file_path": "src/domain/services/InvoiceService.ts",
      "line": 42,
      "expression": "console.log('sending invoice')",
      "reason": "side_effect_call"
    }
  ],
  "fixes_applied": [
    "Injected Logger interface from app layer and removed console.log usage."
  ],
  "revalidated_zero": true,
  "completion_timestamp": "2025-11-07T13:22:10Z"
}
```
