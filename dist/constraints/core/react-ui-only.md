---
id: react-ui-only
name: React Components Stay UI-Only
category: frameworks-react
severity: error
enabled: true
optional: false
version: 1
group: frameworks
---

HEADER
constraint_id: react-ui-only
severity: error
enforcement_order: 26

PURPOSE
Keep React components focused on presentation by forbidding direct IO, domain orchestration, or backend imports inside `apps/web` component directories.

SCOPE
include_paths: ["apps/web/src/features/*/components","apps/web/src/components"]
exclude_paths: ["node_modules","dist","build",".git"]

DEFINITIONS
component_file: `.tsx` under component folders defined above
io_import: specifiers including "axios", "@tanstack/react-query", "@/lib/apiClient", "@/lib/queryClient", "node:http"
domain_module: files under `apps/api` or `apps/web/src/features/*/services` representing non-UI code

FORBIDDEN
- component_file importing io_import or domain_module paths
- Creating async side effects (fetch/axios) directly inside React components
- Reading environment secrets via `process.env` from UI code

ALLOWED
- Consuming hooks exposed by `apps/web/src/features/*/hooks`
- Local UI state management via `useState`, `useReducer`, or `useContext`
- Triggering callbacks passed via props that encapsulate IO

REQUIRED DATA COLLECTION
component_files: string[]
import_specifiers: Record<string,string[]>
async_usages: Record<string,string[]>
violations_initial: ViolationRecord[]

VALIDATION ALGORITHM (PSEUDOCODE)
detection_steps:
- Enumerate component_files under configured folders.
- Parse import_specifiers; flag any reference to io_import or domain_module.
- Scan AST for `fetch`, `axios`, `apiClient`, or `new QueryClient` usage.
```
component_files = glob("apps/web/src/features/**/components/**/*.tsx")
for file in component_files:
  imports = collectImports(file)
  if imports intersects IO_IMPORTS:
    violations_initial.append({ violation_type: "io_in_component", file_path: file, specifier: offending })
  if detectsAsyncCall(file):
    violations_initial.append({ violation_type: "async_effect_in_component", file_path: file })
```

REPORTING CONTRACT
Violation object REQUIRED keys: constraint_id, violation_type, file_path, line, specifier. Order by file_path ASC.

FIX SEQUENCE (STRICT)
1. Extract IO logic into feature hooks under `apps/web/src/features/<feature>/hooks`.
2. Have hooks call `apiClient` or TanStack Query and expose state to components.
3. Update components to consume hook outputs + callbacks only.
4. Remove environment access directly from component bodies.
5. Re-run validation ensuring components are pure presentation.

REVALIDATION LOOP
```
violations_after = rerun_detection()
status = violations_after.length ? "failed" : "passed"
```

SUCCESS CRITERIA (MUST)
- Components import only UI dependencies plus hooks/props.
- No HTTP or persistence libraries appear inside component directories.
- Async behavior mediated through hooks/services.

FAILURE HANDLING
Mark as failed if any component continues to import IO modules after remediation.

COMMON MISTAKES
- Using `useEffect` with inline `fetch` to populate lists.
- Importing Prisma-generated types directly into components.
- Duplicating query logic within each component instead of shared hooks.

POST-FIX ASSERTIONS
- Storybook or unit tests mount components with mocked props instead of network calls.
- `apps/web/src/features/*/hooks` expose typed APIs consumed by UI.

FINAL REPORT SAMPLE
```
{
  "constraint_id": "react-ui-only",
  "violations": [
    {
      "constraint_id": "react-ui-only",
      "violation_type": "io_in_component",
      "file_path": "apps/web/src/features/orders/components/OrderList.tsx",
      "specifier": "@/lib/apiClient"
    }
  ],
  "fixes_applied": [
    "Moved Order data fetching into useOrders hook and passed results via props"
  ],
  "revalidated_zero": true
}
```
