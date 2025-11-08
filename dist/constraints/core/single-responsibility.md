---
id: single-responsibility
name: Enforce Single Responsibility per File
category: structure
severity: error
enabled: true
version: 1
---

HEADER
constraint_id: single-responsibility
severity: error
enforcement_order: 5

PURPOSE
Each implementation file MUST focus on a single responsibility with minimal exports.

SCOPE
include_paths: all `.ts` and `.tsx` files under `src/`
exclude_paths: ["node_modules","dist","build",".git","src/constraints"]

DEFINITIONS
exported_symbol: any exported class, function, constant, or type alias
responsibility_category: classifier derived from exported_symbol kind (service, model, component, util)
single_responsibility_file: file containing <= 3 exports all within the same responsibility_category

FORBIDDEN
- More than 3 exported_symbol entries per file
- Mixing controllers, services, and DTOs in the same file
- Exporting unrelated helper utilities together with primary logic

ALLOWED
- Exporting one primary class plus tightly-related helpers (e.g., factory + interface)
- Exporting multiple types when they are variants of the same domain concept

REQUIRED DATA COLLECTION
exports_by_file: Record<string, { name: string; kind: string }[]>
category_counts: Record<string, Record<string, number>>
violations_initial: ViolationRecord[]

VALIDATION ALGORITHM (PSEUDOCODE)
detection_steps:
- Enumerate .ts/.tsx files under src.
- Parse every export (functions, classes, consts, types) plus inferred category.
- Flag files exceeding three exports or mixing multiple responsibility categories.
```
files = listFiles('src', extensions=['.ts','.tsx'])
for file in files:
    exports = parseExports(file)
    categories = groupByKind(exports)
    total_exports = len(exports)
    if total_exports > 3 or len(categories.keys()) > 1:
        violations_initial.append({
            constraint_id: 'single-responsibility',
            file_path: file,
            export_count: total_exports,
            primary_category: dominantCategory(categories),
            extra_exports: extractExtra(exports, primary_category)
        })
```

REPORTING CONTRACT
REQUIRED keys: constraint_id, file_path, export_count, primary_category, extra_exports. Ordering: sort by export_count DESC, then file_path ASC.

FIX SEQUENCE (STRICT)
1. Identify the core responsibility represented by the file.
2. Move unrelated exports into new files that describe their responsibility explicitly.
3. Keep at most three exports per file (ideally one default + related type).
4. Update import statements and barrel files to mirror the new structure.
5. Add fixes_applied entries referencing both original and new file names.

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
- export_count <= 3 for every file.
- All exports in a file share the same responsibility_category.
- revalidated_zero equals true.

FAILURE HANDLING
If a file still violates export limits after attempt 2, emit status: failed referencing offending files.

COMMON MISTAKES
- Leaving DTO definitions next to controllers for convenience.
- Exporting unrelated helper constants simply because they were used nearby.

POST-FIX ASSERTIONS
- Each new file name reflects its responsibility.
- Barrel files do not reintroduce excessive exports via wildcard spreads.

FINAL REPORT SAMPLE
```
{
  "constraint_id": "single-responsibility",
  "violations": [
    {
      "constraint_id": "single-responsibility",
      "file_path": "src/app/orders/OrderController.ts",
      "export_count": 6,
      "primary_category": "controller",
      "extra_exports": ["mapOrder", "OrderRepository", "buildOrderResponse"]
    }
  ],
  "fixes_applied": [
    "Split OrderController helpers into OrderMapper and OrderRepositoryAdapter files."
  ],
  "revalidated_zero": true,
  "completion_timestamp": "2025-11-07T14:22:11Z"
}
```
