---
id: max-file-lines
name: Cap File Length at 300 Lines
category: size
severity: error
enabled: true
version: 1
group: best-practices
---

HEADER
constraint_id: max-file-lines
severity: error
enforcement_order: 4

PURPOSE
All implementation files MUST remain at or below 300 logical lines.

SCOPE
include_paths: any `.ts` or `.tsx` file under `src/`
exclude_paths: ["node_modules","dist","build",".git","src/constraints"]

DEFINITIONS
logical_line: code line minus blank lines and full-line comments
line_window: tuple capturing first and last logical line belonging to the same module section
oversized_file: file with logical_line_count > 300

FORBIDDEN
- Files whose logical_line_count exceeds 300
- Sliding new logic into ignored comments to bypass counting

ALLOWED
- Temporary investigative scripts outside `src/`
- Auto-generated type definitions stored under `dist/`

REQUIRED DATA COLLECTION
candidate_files: string[]
file_line_counts: Record<string, { logical_line_count: number; line_start: number; line_end: number }>
violations_initial: ViolationRecord[]

VALIDATION ALGORITHM (PSEUDOCODE)
detection_steps:
- List all .ts/.tsx files under src excluding ignored directories.
- Count logical (non-comment, non-blank) lines for each file.
- Record files whose counts exceed 300 lines.
```
candidate_files = listFiles('src', extensions=['.ts','.tsx'])
for file in candidate_files:
    logical_line_count, bounds = countLogicalLines(file)
    if logical_line_count > 300:
        violations_initial.append({
            constraint_id: 'max-file-lines',
            file_path: file,
            line_start: bounds.start,
            line_end: bounds.end,
            logical_line_count: logical_line_count
        })
```

REPORTING CONTRACT
Violation object REQUIRED keys: constraint_id, file_path, line_start, line_end, logical_line_count. Ordering: sort by logical_line_count DESC then file_path ASC.

FIX SEQUENCE (STRICT)
1. Identify cohesive responsibilities within the oversized file.
2. Extract each responsibility into its own module (max 3 exports).
3. Keep shared types in dedicated `types` modules rather than reusing the large file.
4. Update imports and ensure barrel files do not re-introduce size creep.
5. Document resulting splits and affected files in fixes_applied.

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
- No files exceed 300 logical lines.
- Each extracted module honors single-responsibility and export limits.
- revalidated_zero equals true.

FAILURE HANDLING
If any oversized file persists after second attempt, emit status: failed and block further constraints.

COMMON MISTAKES
- Extracting helper functions but leaving large conditional blocks behind.
- Moving logic without updating imports causing dead code.

POST-FIX ASSERTIONS
- Each new file reports <= 300 logical lines.
- Unit tests reference new modules instead of the old monolith.

FINAL REPORT SAMPLE
```
{
  "constraint_id": "max-file-lines",
  "violations": [
    {
      "constraint_id": "max-file-lines",
      "file_path": "src/app/UserService.ts",
      "line_start": 1,
      "line_end": 362,
      "logical_line_count": 326
    }
  ],
  "fixes_applied": [
    "Split UserService into UserReadService and UserWriteService (each < 180 lines)."
  ],
  "revalidated_zero": true,
  "completion_timestamp": "2025-11-07T14:02:31Z"
}
```
