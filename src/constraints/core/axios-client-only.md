---
id: axios-client-only
name: Shared Axios Client Only
category: frameworks-http-client
severity: error
enabled: false
optional: true
version: 1
group: frameworks
---

HEADER
constraint_id: axios-client-only
severity: error
enforcement_order: 28

PURPOSE
Force every HTTP request on the frontend to flow through the shared Axios wrapper `apps/web/src/lib/apiClient.ts` so headers, interceptors, and telemetry stay consistent.

SCOPE
include_paths: ["apps/web/src"]
exclude_paths: ["node_modules","dist","build",".git"]

DEFINITIONS
shared_client_module: `apps/web/src/lib/apiClient.ts`
direct_axios_import: `import axios from "axios"` or named imports from `axios`
custom_http_client: ad-hoc modules instantiating Axios elsewhere

FORBIDDEN
- direct_axios_import anywhere under `apps/web/src` outside shared_client_module
- Creating fetch wrappers that bypass shared_client_module interceptors
- Mutating shared_client_module configuration from arbitrary files

ALLOWED
- Importing shared_client_module and calling its exported methods
- Using native `fetch` for same-origin, non-JSON assets (e.g., image preloads) explicitly documented in code review
- Backend (`apps/api`) Axios usage for integration tests if isolated from frontend bundle

REQUIRED DATA COLLECTION
frontend_files: string[]
axios_imports: Record<string,string[]>
custom_client_defs: string[]
violations_initial: ViolationRecord[]

VALIDATION ALGORITHM (PSEUDOCODE)
detection_steps:
- Traverse `apps/web/src/**/*.ts*`.
- Flag direct_axios_import occurrences outside shared_client_module.
- Detect modules exporting Axios instances via `axios.create` outside shared_client_module.
- Ensure shared_client_module is the only file importing raw Axios.
```
frontend_files = glob("apps/web/src/**/*.ts*")
for file in frontend_files:
  imports = collectImports(file)
  if "axios" in imports and file != shared_client_module:
    violations_initial.append({ violation_type: "direct_axios_import", file_path: file })
  if containsAxiosCreate(file) and file != shared_client_module:
    violations_initial.append({ violation_type: "rogue_axios_instance", file_path: file })
```

REPORTING CONTRACT
Violation object REQUIRED keys: constraint_id, violation_type, file_path, line, specifier. Sort by file_path ASC.

FIX SEQUENCE (STRICT)
1. Move Axios configuration (base URL, interceptors, auth headers) into shared_client_module.
2. Replace direct imports with `import { apiClient } from "@/lib/apiClient"`.
3. Delete rogue Axios instances and ensure wrappers call shared client functions.
4. Update TanStack Query hooks to depend on shared client for `queryFn`.
5. Re-run validation verifying only shared_client_module imports Axios.

REVALIDATION LOOP
```
violations_after = rerun_detection()
status = violations_after.length ? "failed" : "passed"
```

SUCCESS CRITERIA (MUST)
- Exactly one file imports `axios`.
- All other modules call shared_client_module exports.
- Interceptors execute globally (auth, telemetry, error logging).

FAILURE HANDLING
Mark as failed if any direct_axios_import remains or multiple Axios instances exist.

COMMON MISTAKES
- Creating feature-specific HTTP clients for experimentation.
- Importing Axios in unit tests without mocking shared_client_module.
- Reconfiguring axios.defaults outside the shared file.

POST-FIX ASSERTIONS
- Integration tests stub shared_client_module instead of raw Axios.
- Shared client exports typed helpers (get/post/mutate) consumed across features.

FINAL REPORT SAMPLE
```
{
  "constraint_id": "axios-client-only",
  "violations": [
    {
      "constraint_id": "axios-client-only",
      "violation_type": "direct_axios_import",
      "file_path": "apps/web/src/features/billing/hooks/useInvoices.ts",
      "specifier": "axios"
    }
  ],
  "fixes_applied": [
    "Removed axios import and consumed shared apiClient.get('/invoices')"
  ],
  "revalidated_zero": true
}
```
