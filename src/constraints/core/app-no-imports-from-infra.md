---
id: app-no-imports-from-infra
name: App Cannot Import Infra
category: layering
severity: error
enabled: true
version: 1
---

HEADER
constraint_id: app-no-imports-from-infra
severity: error
enforcement_order: 2

PURPOSE
Application layer MUST NOT depend directly on infrastructure implementations.

SCOPE
include_paths: any file path containing '/app/'
exclude_paths: ["node_modules","dist","build",".git"]

DEFINITIONS
layer(app): file path contains '/app/' segment
layer(domain): file path contains '/domain/' segment
layer(infra): file path contains '/infra/' segment
layer(external): bare module specifier without leading './' or '../'
cross_layer_facade: domain-defined interface that infra implements and app consumes

FORBIDDEN
- Imports classified as infra
- Relative paths from app to '../infra' or '/infra'
- Importing concrete data stores, queues, or gateways housed in infra

ALLOWED
- Imports from domain modules
- Imports from cross_layer_facade interfaces that domain owns
- Imports from external packages (frameworks, UI libs)

REQUIRED DATA COLLECTION
files_app: string[]
imports_by_file: Record<string, { line: number; specifier: string }[]>
violations_initial: ViolationRecord[]

VALIDATION ALGORITHM (PSEUDOCODE)
detection_steps:
- Collect every /app/ file except ignored paths.
- Parse import statements and classify their resolved layer.
- Emit violations for any import mapped to infra.
```
files_app = findFiles('/app/')
for file in files_app:
    imports = parseImports(file)
    for imp in imports:
        resolved = classifyLayer(imp.specifier, file)
        if resolved == 'infra':
            violations_initial.append({
                constraint_id: 'app-no-imports-from-infra',
                file_path: file,
                line: imp.line,
                specifier: imp.specifier,
                resolved_layer: resolved
            })
```

REPORTING CONTRACT
Violation object REQUIRED keys: constraint_id, file_path, line, specifier, resolved_layer. Ordering: sort by file_path ASC then line ASC. Optional disputed metadata allowed when false positive suspected.

FIX SEQUENCE (STRICT)
1. Identify the concrete capability pulled from infra (database access, queue, etc.).
2. Move orchestration responsibility back into infra or domain service.
3. Define/extend a cross_layer_facade owned by domain.
4. Update app code to depend on the facade and remove direct infra imports.
5. Document each fix referencing affected files and facades.

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
- No app file imports infra modules.
- fixes_applied references each original violation.
- revalidated_zero equals true.

FAILURE HANDLING
If violations persist, emit report with status: failed and halt sequential ordering until addressed.

COMMON MISTAKES
- Importing infra models for typing convenience.
- Allowing infra helper functions to creep into app controllers.

POST-FIX ASSERTIONS
- App layer depends only on domain + external packages.
- Any required infra capability exposed through a facade or service interface.

FINAL REPORT SAMPLE
```
{
  "constraint_id": "app-no-imports-from-infra",
  "violations": [
    {
      "constraint_id": "app-no-imports-from-infra",
      "file_path": "src/app/controllers/UserController.ts",
      "line": 7,
      "specifier": "../infra/repositories/UserRepository",
      "resolved_layer": "infra"
    }
  ],
  "fixes_applied": [
    "Introduced IUserRepository interface in domain and moved infra import behind adapter."
  ],
  "revalidated_zero": true,
  "completion_timestamp": "2025-11-07T13:05:44Z"
}
```
