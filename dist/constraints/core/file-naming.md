---
id: file-naming
name: Enforce Consistent File Naming
category: naming
severity: error
enabled: true
version: 1
group: best-practices
---

HEADER
constraint_id: file-naming
severity: error
enforcement_order: 7

PURPOSE
File names MUST follow deterministic casing rules by layer and artifact type.

SCOPE
include_paths: all files under `src/`
exclude_paths: ["node_modules","dist","build",".git","src/constraints"]

DEFINITIONS
kebab_case_name: lowercase words joined by dashes (e.g., order-service.ts)
pascal_case_name: UpperCamelCase (e.g., OrderWizard.tsx)
component_file: `.tsx` file exporting a React component
exception_suffix: `.spec.ts` or `.test.ts` files which may append `.spec` while keeping kebab-case basename

FORBIDDEN
- `.ts` files whose basename is not kebab-case
- `.tsx` component files whose basename is not PascalCase
- Mixed casing (Order_service.ts) or spaces

ALLOWED
- `.d.ts` files mirroring upstream package names
- Config stubs under `src/app/config/` that intentionally mirror vendor casing

REQUIRED DATA COLLECTION
tracked_files: string[]
naming_metadata: { file_path: string; extension: string; basename: string; inferred_kind: string }[]
violations_initial: ViolationRecord[]

VALIDATION ALGORITHM (PSEUDOCODE)
detection_steps:
- List all files under src excluding ignored directories.
- Infer expected naming pattern (kebab vs Pascal) per file type.
- Flag file names that do not match the expected pattern.
```
tracked_files = listFiles('src')
for file in tracked_files:
    metadata = classifyFileName(file)
    expected = expectedPattern(metadata)
    if not matchesPattern(metadata.basename, expected):
        violations_initial.append({
            constraint_id: 'file-naming',
            file_path: file,
            actual_name: metadata.basename,
            expected_pattern: expected,
            reason: metadata.inferred_kind
        })
```

REPORTING CONTRACT
REQUIRED keys: constraint_id, file_path, actual_name, expected_pattern, reason. Ordering: sort by expected_pattern ASC then file_path ASC.

FIX SEQUENCE (STRICT)
1. Determine the correct case rule for the file (kebab or Pascal).
2. Rename the file and update import paths everywhere.
3. Ensure tests and barrel files reference the new name exactly.
4. Confirm case-sensitive file systems (Linux CI) match the new casing.
5. Record rename operations in fixes_applied (old -> new).

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
- All `.ts` files use kebab-case (plus optional `.spec`/`.test` suffix).
- All `.tsx` component files use PascalCase.
- revalidated_zero equals true.

FAILURE HANDLING
If any filename remains incorrect after second attempt, emit status: failed and block folder-naming enforcement to avoid cascading renames.

COMMON MISTAKES
- Renaming file but forgetting to update imports on case-sensitive CI.
- Assuming PascalCase is allowed for services.

POST-FIX ASSERTIONS
- `git status --short` shows the rename operation on case-sensitive systems.
- Storybook or routing metadata updated to reflect new casing when needed.

FINAL REPORT SAMPLE
```
{
  "constraint_id": "file-naming",
  "violations": [
    {
      "constraint_id": "file-naming",
      "file_path": "src/app/services/UserService.ts",
      "actual_name": "UserService",
      "expected_pattern": "kebab-case",
      "reason": "service"
    }
  ],
  "fixes_applied": [
    "Renamed UserService.ts to user-service.ts and updated imports."
  ],
  "revalidated_zero": true,
  "completion_timestamp": "2025-11-07T15:01:18Z"
}
```
