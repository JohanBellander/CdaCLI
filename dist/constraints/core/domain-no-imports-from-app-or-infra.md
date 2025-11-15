---
id: domain-no-imports-from-app-or-infra
name: Domain Cannot Import App or Infra
category: layering
severity: error
enabled: true
version: 1
group: architecture
---

HEADER
constraint_id: domain-no-imports-from-app-or-infra
severity: error
enforcement_order: 1

PURPOSE
Domain layer MUST NOT import code from app or infra layers.

SCOPE
include_paths: any file path containing '/domain/'
exclude_paths: ["node_modules","dist","build",".git"]

DEFINITIONS
layer(domain): file path contains '/domain/' segment
layer(app): file path contains '/app/' segment
layer(infra): file path contains '/infra/' segment
layer(external): bare module specifier without leading './' or '../'
layer(unknown): resolution fails or outside repository root

FORBIDDEN
- Import classified as app
- Import classified as infra

ALLOWED
- Imports classified as domain
- Imports classified as external
- Type-only imports from external packages

REQUIRED DATA COLLECTION
files_domain: string[]
imports_by_file: Record<string, { line: number; specifier: string }[]>
violations_initial: ViolationRecord[]

VALIDATION ALGORITHM (PSEUDOCODE)
detection_steps:
- Enumerate every file under /domain/ excluding ignored paths.
- Parse and classify each import specifier relative to the current file.
- Record an initial violation whenever the resolved layer is app or infra.
```
files_domain = findFiles('/domain/')
for file in files_domain:
    imports = parseImports(file)
    for imp in imports:
        resolved = classifyLayer(imp.specifier, file)
        if resolved in ['app','infra']:
            violations_initial.append({
                constraint_id: 'domain-no-imports-from-app-or-infra',
                file_path: file,
                line: imp.line,
                specifier: imp.specifier,
                resolved_layer: resolved
            })
```

REPORTING CONTRACT
Violation object REQUIRED keys: constraint_id, file_path, line, specifier, resolved_layer. Ordering: sort by file_path ASC then line ASC. Optional keys allowed only when dispute occurs (`disputed`, `dispute_reason`).

FIX SEQUENCE (STRICT)
1. Determine whether the import is orchestration or infrastructural.
2. Move orchestration to app or infrastructure interaction to infra.
3. Introduce a domain-facing interface to decouple domain code.
4. Update domain imports to target the interface or another domain module.
5. Append remediation summary referencing affected files to fixes_applied.

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
- violations list empty after final pass.
- Each initial violation referenced in fixes_applied.
- revalidated_zero equals true.

FAILURE HANDLING
If violations remain after attempt 2, emit report with status: failed and halt sequential progression.

COMMON MISTAKES
- Moving pure domain logic out of domain unnecessarily.
- Wrapping infra import with a thin adapter yet keeping direct dependency.

POST-FIX ASSERTIONS
- No domain file imports from '/app/' or '/infra/'.
- Newly added files continue to satisfy single-responsibility and max-file-lines.

FINAL REPORT SAMPLE
```
{
  "constraint_id": "domain-no-imports-from-app-or-infra",
  "violations": [
    {
      "constraint_id": "domain-no-imports-from-app-or-infra",
      "file_path": "src/domain/OrderCalculator.ts",
      "line": 11,
      "specifier": "../app/OrderCoordinator",
      "resolved_layer": "app"
    }
  ],
  "fixes_applied": [
    "Moved orchestration to src/app/OrderCoordinator.ts and introduced IOrderCoordinator."
  ],
  "revalidated_zero": true,
  "completion_timestamp": "2025-11-07T12:55:10Z"
}
```
