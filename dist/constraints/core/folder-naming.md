---
id: folder-naming
name: Enforce Consistent Folder Naming
category: naming
severity: error
enabled: true
version: 1
---

HEADER
constraint_id: folder-naming
severity: error
enforcement_order: 8

PURPOSE
Directory names MUST follow deterministic kebab-case conventions to avoid ambiguity on case-sensitive systems.

SCOPE
include_paths: all directories under `src/`
exclude_paths: ["node_modules","dist","build",".git","src/constraints"]

DEFINITIONS
kebab_case_folder: lowercase letters, numbers, and dashes (e.g., order-processing)
reserved_roots: ["domain","app","infra"] directories anchoring the architecture
violation_folder: directory whose basename fails kebab_case_folder or conflicts by case only

FORBIDDEN
- Directories containing uppercase characters (e.g., FeatureFlags)
- CamelCase or snake_case folders
- Duplicate names that differ only by case on case-insensitive systems

ALLOWED
- Reserved roots domain/app/infra
- Vendor folders explicitly mirrored under `src/app/config/vendor-*`

REQUIRED DATA COLLECTION
folders: string[]
folder_metadata: { path: string; basename: string }[]
case_collision_groups: Record<string, string[]>
violations_initial: ViolationRecord[]

VALIDATION ALGORITHM (PSEUDOCODE)
detection_steps:
- Enumerate every directory under src (excluding ignored paths).
- Validate each basename against kebab-case unless reserved root.
- Detect case-collision groups that differ only by casing.
```
folders = listDirectories('src')
collisions = groupByLowercase(folders)
for folder in folders:
    base = basename(folder)
    if base in reserved_roots:
        continue
    if not matchesKebabCase(base):
        violations_initial.append({
            constraint_id: 'folder-naming',
            folder_path: folder,
            actual_name: base,
            expected_pattern: 'kebab-case'
        })
for key, group in collisions.items():
    if len(group) > 1:
        violations_initial.append({
            constraint_id: 'folder-naming',
            folder_path: group.join(', '),
            actual_name: key,
            expected_pattern: 'unique casing',
            reason: 'case-collision'
        })
```

REPORTING CONTRACT
REQUIRED keys: constraint_id, folder_path, actual_name, expected_pattern. Optional key `reason` allowed only for case collisions. Ordering: sort by folder_path ASC.

FIX SEQUENCE (STRICT)
1. Rename offending folders to kebab-case (lowercase words separated by dashes).
2. Update import paths, tsconfig path aliases, and tooling configs.
3. Remove duplicate/collision folders by consolidating contents.
4. Run `npm test` to ensure module resolution still works.
5. Record each rename pair (old -> new) in fixes_applied.

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
- All non-reserved directories are kebab-case.
- No case-collision duplicates remain.
- revalidated_zero equals true.

FAILURE HANDLING
If any invalid folder persists after attempt 2, emit status: failed and halt further automation since imports may remain ambiguous.

COMMON MISTAKES
- Renaming folders without updating Storybook or Jest moduleNameMapper.
- Leaving uppercase abbreviations (e.g., HTTP) untouched.

POST-FIX ASSERTIONS
- `git status` shows directory renames tracked correctly.
- Path aliases (tsconfig paths, webpack) reflect the new casing.

FINAL REPORT SAMPLE
```
{
  "constraint_id": "folder-naming",
  "violations": [
    {
      "constraint_id": "folder-naming",
      "folder_path": "src/app/FeatureFlags",
      "actual_name": "FeatureFlags",
      "expected_pattern": "kebab-case"
    }
  ],
  "fixes_applied": [
    "Renamed FeatureFlags -> feature-flags and updated import paths."
  ],
  "revalidated_zero": true,
  "completion_timestamp": "2025-11-07T15:20:02Z"
}
```
