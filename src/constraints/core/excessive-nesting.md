---
id: excessive-nesting
name: Limit Control-Flow Nesting Depth
category: structure
severity: error
enabled: true
version: 1
---

HEADER
constraint_id: excessive-nesting
severity: error
enforcement_order: 6

PURPOSE
Control flow nesting depth MUST NOT exceed 3 levels in any function.

SCOPE
include_paths: all `.ts` and `.tsx` files under `src/`
exclude_paths: ["node_modules","dist","build",".git","src/constraints"]

DEFINITIONS
nesting_level: count of stacked blocks (if/else, loops, try/catch, callbacks) at a specific AST node
hotspot_function: function containing any block with nesting_level > 3

FORBIDDEN
- Nesting_level > 3 inside any function or method
- Callback pyramids formed by inline promises or event handlers

ALLOWED
- Guard clauses that exit early before deeper nesting occurs
- Delegating to helper functions to flatten structure

REQUIRED DATA COLLECTION
functions_by_file: Record<string, { name: string; max_nesting: number; lines: [number, number] }[]>
violations_initial: ViolationRecord[]

VALIDATION ALGORITHM (PSEUDOCODE)
detection_steps:
- Enumerate .ts/.tsx files.
- Parse each function/method body and compute maximum block depth.
- Report functions whose max_nesting exceeds 3.
```
files = listFiles('src', extensions=['.ts','.tsx'])
for file in files:
    ast = parseFile(file)
    functions = collectFunctions(ast)
    for fn in functions:
        max_depth = measureNesting(fn)
        if max_depth > 3:
            violations_initial.append({
                constraint_id: 'excessive-nesting',
                file_path: file,
                function_name: fn.name,
                max_nesting: max_depth,
                line_start: fn.start,
                line_end: fn.end
            })
```

REPORTING CONTRACT
REQUIRED keys: constraint_id, file_path, function_name, max_nesting, line_start, line_end. Ordering: sort by max_nesting DESC then file_path ASC.

FIX SEQUENCE (STRICT)
1. Identify decision points contributing to depth.
2. Replace deep conditional ladders with guard clauses or lookup tables.
3. Extract nested logic into helper functions or strategy objects.
4. Ensure promise chains are flattened using async/await.
5. Document each flattened function and link to new helpers in fixes_applied.

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
- max_nesting <= 3 for all functions.
- Extracted helpers remain within single-responsibility bounds.
- revalidated_zero equals true.

FAILURE HANDLING
If any hotspot_function exceeds limits after second attempt, emit status: failed and block downstream constraints.

COMMON MISTAKES
- Converting nested callbacks to async/await but leaving large switch statements untouched.
- Moving logic into anonymous inline functions instead of named helpers.

POST-FIX ASSERTIONS
- Guard clauses cover invalid states early.
- Complex workflows are documented with sequence diagrams or ADRs when needed.

FINAL REPORT SAMPLE
```
{
  "constraint_id": "excessive-nesting",
  "violations": [
    {
      "constraint_id": "excessive-nesting",
      "file_path": "src/app/payments/PaymentProcessor.ts",
      "function_name": "process",
      "max_nesting": 5,
      "line_start": 38,
      "line_end": 142
    }
  ],
  "fixes_applied": [
    "Introduced guard clauses and delegated nested checks to PaymentValidator helper."
  ],
  "revalidated_zero": true,
  "completion_timestamp": "2025-11-07T14:41:55Z"
}
```
