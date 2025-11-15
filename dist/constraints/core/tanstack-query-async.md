---
id: tanstack-query-async
name: TanStack Query for Async Data
category: frameworks-react-query
severity: error
enabled: false
optional: true
version: 1
group: frameworks
---

HEADER
constraint_id: tanstack-query-async
severity: error
enforcement_order: 27

PURPOSE
Enforce that asynchronous HTTP interactions inside `apps/web` flow through the shared TanStack Query client so caching, retries, and suspense behavior stay centralized.

SCOPE
include_paths: ["apps/web/src"]
exclude_paths: ["node_modules","dist","build",".git"]

DEFINITIONS
query_hook: functions exported from `apps/web/src/features/*/hooks` that call `useQuery`, `useMutation`, or `useInfiniteQuery`
raw_fetch_call: usage of `fetch`, `axios`, or `apiClient` outside TanStack Query contexts
query_client_module: `apps/web/src/lib/queryClient.ts`

FORBIDDEN
- raw_fetch_call inside React components or hooks when TanStack Query would satisfy the use case
- Creating new `QueryClient` instances outside `query_client_module`
- Manually caching requests with custom state instead of query hooks

ALLOWED
- Server-only fetches inside Next.js Route Handlers that never hydrate to the client
- One-off telemetry or analytics POSTs that intentionally bypass caching
- Direct `apiClient` usage inside TanStack Query `queryFn` implementations

REQUIRED DATA COLLECTION
async_files: string[]
query_usages: Record<string,string[]>
raw_calls: Record<string,string[]>
violations_initial: ViolationRecord[]

VALIDATION ALGORITHM (PSEUDOCODE)
detection_steps:
- Identify `.ts`/`.tsx` files importing `fetch`, `axios`, or `apiClient`.
- Determine whether file already calls `useQuery`/`useMutation`.
- Flag files performing raw_fetch_call within React component bodies or custom hooks without wrapping TanStack Query.
- Detect new `QueryClient()` expressions outside `query_client_module`.
```
async_files = glob("apps/web/src/**/*.ts*")
for file in async_files:
  if containsRawFetch(file) and not wrapsTanStackQuery(file):
    violations_initial.append({ violation_type: "raw_fetch_without_query", file_path: file })
  if contains("new QueryClient(") and file != query_client_module:
    violations_initial.append({ violation_type: "rogue_query_client", file_path: file })
```

REPORTING CONTRACT
Violation object REQUIRED keys: constraint_id, violation_type, file_path, line, specifier. Order by violation_type ASC then file_path ASC.

FIX SEQUENCE (STRICT)
1. Move HTTP calls into query_hook factories using `useQuery`/`useMutation`.
2. Ensure every hook references the shared query_client_module via provider setup.
3. Delete rogue `QueryClient` instantiations and import the shared client instead.
4. Update tests to mock TanStack Query hooks instead of raw fetches.
5. Re-run validation verifying no raw_fetch_call remains.

REVALIDATION LOOP
```
violations_after = rerun_detection()
status = violations_after.length === 0 ? "passed" : "failed"
```

SUCCESS CRITERIA (MUST)
- All async UI operations use TanStack Query hooks.
- Only one query_client_module instantiates QueryClient.
- Hooks expose typed data/selectors derived from query results.

FAILURE HANDLING
Fail if raw_fetch_call persists or QueryClient duplication remains after remediation cycle.

COMMON MISTAKES
- Calling `apiClient.get` inside `useEffect` instead of `useQuery`.
- Creating feature-specific QueryClient instances for isolation.
- Forgetting to set default query options in the shared client.

POST-FIX ASSERTIONS
- `_app.tsx` or equivalent wraps the tree with `QueryClientProvider`.
- Feature hooks expose `queryKey` constants reused across consumers.

FINAL REPORT SAMPLE
```
{
  "constraint_id": "tanstack-query-async",
  "violations": [
    {
      "constraint_id": "tanstack-query-async",
      "violation_type": "raw_fetch_without_query",
      "file_path": "apps/web/src/features/tasks/hooks/useTasks.ts",
      "specifier": "apiClient.get"
    }
  ],
  "fixes_applied": [
    "Replaced raw apiClient call with useQuery({ queryKey: ['tasks'], queryFn: fetchTasks })"
  ],
  "revalidated_zero": true
}
```
