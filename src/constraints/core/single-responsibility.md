---
id: single-responsibility
name: Enforce Single Responsibility per File
category: structure
severity: error
enabled: true
version: 1
group: best-practices
---

HEADER
constraint_id: single-responsibility
severity: error
enforcement_order: 5

PURPOSE
Each implementation file MUST focus on a single responsibility with minimal exports.

CRITICAL EXAMPLES:
✅ ALLOWED: contact.ts with Contact + ContactSchema + CreateContactInput + UpdateContactInput (4 exports) = single "Contact" responsibility
✅ ALLOWED: index.ts barrel files with ANY number of re-exports (aggregation is their purpose)
✅ ALLOWED: formatters.ts with 6 amount formatting functions = single "amount formatting" responsibility
❌ FORBIDDEN: crm.ts with ContactService + BillingService + ReportService (3 exports but MIXED responsibilities)

Focus on detecting MIXED RESPONSIBILITIES, not counting exports. Files with 4-7 cohesive exports sharing a concept are acceptable.

SCOPE
include_paths: all `.ts` and `.tsx` files under `src/`
exclude_paths: ["node_modules","dist","build",".git","src/constraints"]

DEFINITIONS
exported_symbol: any exported class, function, constant, or type alias
responsibility_category: classifier derived from exported_symbol kind (service, model, component, util)
cohesive_exports: exports sharing a common slug/prefix (Contact*, amount*, user*) or single domain concept
single_responsibility_file: file where all exports serve the same responsibility (cohesive_exports = true)

FORBIDDEN
- Mixing unrelated responsibilities (contacts + billing + reports in one file)
- Controllers + services + DTOs + utilities together (multiple concerns)
- Export count >12 with mixed categories (god-module signal)

ALLOWED
- Entity + schema + input DTOs sharing a domain slug (Contact, ContactSchema, CreateContactInput)
- Multiple related utility functions (formatAmount, parseAmount, validateAmount)
- Barrel files (index.ts) with unlimited re-exports (aggregation is their purpose)
- Feature entry files (<feature-slug>.ts) re-exporting submodules for clean API

REQUIRED DATA COLLECTION
exports_by_file: Record<string, { name: string; kind: string }[]>
category_counts: Record<string, Record<string, number>>
violations_initial: ViolationRecord[]

VALIDATION ALGORITHM (PSEUDOCODE)
IMPORTANT: Focus on detecting MIXED RESPONSIBILITIES, not enforcing arbitrary export counts.

detection_steps:
- Enumerate .ts/.tsx files under src.
- Parse every export (functions, classes, consts, types) and derive slugs/categories.
- Analyze cohesion: Do exports share a common prefix/slug? Do they serve the same domain concept?
- Flag files with MIXED categories (controller + service + DTO in one file) OR >12 exports with unrelated slugs.
- DO NOT flag: Cohesive files with 4-7 exports sharing a slug (Contact*), barrel files (index.ts), utility clusters (amount formatting).
```
files = listFiles('src', extensions=['.ts','.tsx'])
for file in files:
    exports = parseExports(file)
    categories = groupByKind(exports)
    total_exports = len(exports)
    
    # Determine if this is a barrel or feature entry file
    is_barrel = file.endsWith('index.ts')
    is_feature_entry = isFeatureRootEntry(file)  # e.g., src/domain/contacts/contacts.ts
    threshold = 5 if (is_barrel or is_feature_entry) else 3
    
    if total_exports > threshold or (len(categories.keys()) > 1 and not is_barrel):
        violations_initial.append({
            constraint_id: 'single-responsibility',
            file_path: file,
            export_count: total_exports,
            threshold: threshold,
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
- No files mix unrelated responsibility categories (controller + service + DTO violations removed).
- Cohesive files with shared slugs/concepts are not flagged (Contact + ContactSchema + DTOs acceptable).
- Barrel files (index.ts) and feature entry files exempted from export limits.
- Only god-modules (>12 exports with unrelated categories) trigger violations.
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
