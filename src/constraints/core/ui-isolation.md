---
id: ui-isolation
name: UI Isolation from Services
category: presentation
severity: error
enabled: true
optional: true
version: 1
group: architecture
---

HEADER
constraint_id: ui-isolation
severity: error
enforcement_order: 18

PURPOSE
Keep Next.js/React UI components focused on rendering by forcing all IO and orchestration through feature hooks/services instead of importing backend modules or HTTP clients directly.

SCOPE
include_paths: [
  "apps/web/src/features/*/components",
  "apps/web/src/components",
  "apps/web/src/app"
]
allowed_support_paths: [
  "apps/web/src/features/*/hooks",
  "apps/web/src/features/*/services",
  "apps/web/src/features/*/state",
  "apps/web/src/lib"
]
exclude_paths: ["node_modules","dist","build",".git","tests","apps/web/src/lib/__mocks__","apps/web/src/lib/__tests__"]

DEFINITIONS
feature_component: `.tsx` or `.ts` file under include_paths that renders UI
feature_hook: module located in allowed_support_paths ending in `/hooks/**` or `/services/**` that encapsulates IO/state
shared_client_module: `apps/web/src/lib/apiClient.ts` or `apps/web/src/lib/queryClient.ts`
forbidden_layer: import targets rooted in `apps/api`, `packages/shared-types/src/server-only`, or `apps/web/src/features/*/infra`
direct_service_call: invocation of `fetch`, `apiClient.*`, `axios.*`, or TanStack Query clients from inside a feature_component

FORBIDDEN
- feature_component importing modules from `apps/api/**`, `apps/web/src/server/**`, or `apps/web/src/features/*/infra/**`
- Imports from shared_client_module or other HTTP clients directly inside feature_component
- direct_service_call (fetch/apiClient/queryClient) performed from a feature_component instead of a feature_hook
- Complex business branching (>3 decision points) inside feature_component bodies
- Accessing global singletons or shared stores without going through feature_hook abstractions

ALLOWED
- Server components in `apps/web/src/app/**` that simply pass data down to client components
- UI components importing feature_hook modules that internally call TanStack Query or apiClient helpers
- Invoking local state containers under `apps/web/src/features/*/state/**` that wrap hooks/services
- Importing types/constants from `packages/shared-types` (read-only) to shape props
- Test-only mocks defined under `apps/web/src/features/*/__mocks__`

REQUIRED DATA COLLECTION
component_imports: {
  file_path: string;
  line: number;
  specifier: string;
  resolved_layer: string;
}[]
service_calls: {
  file_path: string;
  line: number;
  expression: string;
  kind: 'fetch' | 'axios' | 'graphql' | 'repo' | 'custom-http';
}[]
branching_complexity: {
  file_path: string;
  decision_points: number;
  line_start: number;
  line_end: number;
}[]

VALIDATION ALGORITHM (PSEUDOCODE)
detection_steps:
- Parse imports within feature_component files and classify resolved_layer; flag anything referencing forbidden_layer.
- Analyze AST bodies for calls to shared_client_module, fetch, axios.*, graphqlClient.*, repository.*, or TanStack Query primitives invoked directly by the component and record service_calls.
- Count conditional nodes per component render function; flag components exceeding decision_points > 3.
- Report each breach with file, line, and remediation hint.
```
uiFiles = findFiles('apps/web/src', { extensions: ['tsx','ts','js','jsx'] })
for file in uiFiles:
  imports = parseImports(file)
  for imp in imports:
    target = resolveLayer(imp.specifier)
    component_imports.append({ file_path: file, line: imp.line, specifier: imp.specifier, resolved_layer: target })
    if target in forbidden_layers:
      violations.append({ type: 'forbidden-import', ... })
  ast = parseAst(file)
  calls = findServiceCalls(ast, disallow=['apiClient','queryClient','fetch'])
  for call in calls:
    service_calls.append(call)
    violations.append({ type: 'direct-service-call', ... })
  decisions = countDecisionPoints(ast.renderFunction)
  if decisions > 3:
    branching_complexity.append({ file_path: file, decision_points: decisions, line_start: ast.renderFunction.start, line_end: ast.renderFunction.end })
```

REPORTING CONTRACT
REQUIRED keys: constraint_id, violation_type, file_path, line, details. Optional keys: specifier, resolved_layer, expression, decision_points. Each component may yield multiple violations.

FIX SEQUENCE (STRICT)
1. Extract business logic out of UI components into feature hooks/services under `apps/web/src/features/*/{hooks,services}` and inject results via props.
2. Replace direct service calls with TanStack Query hooks or shared services that wrap `apiClient` and `queryClient`.
3. Simplify render branching by moving decision-heavy code into selectors returned by hooks.
4. Add UI tests verifying the hook contract and component props to guard against regressions.

REVALIDATION LOOP
```
rerun detection steps until no forbidden imports or service_calls remain (max 2 attempts)
```

SUCCESS CRITERIA (MUST)
- component_imports never resolve to forbidden_layer targets
- service_calls array empty within feature_component files
- branching_complexity entries <= 3 decision points per component

FAILURE HANDLING
If a Next.js route file must fetch data on the server (e.g., Route Handler or server component), isolate that logic to the framework entry, keep the module under `apps/web/src/app/**`, and document the handoff to feature hooks before resuming checks.

COMMON MISTAKES
- Adding feature flags and branching directly in JSX instead of moving them into hooks/selectors
- Importing repositories or Fastify handlers into React hooks because they appear convenient
- Copying server utilities into components for experiments without routing them through `apps/web/src/features/*/hooks`

POST-FIX ASSERTIONS
- UI components receive all data via hooks/props without importing shared_client_module
- No HTTP or persistence logic resides in `apps/web/src/features/*/components`
- Render functions remain declarative with minimal branching

FINAL REPORT SAMPLE
```
{
  "constraint_id": "ui-isolation",
  "violations": [
    {
      "constraint_id": "ui-isolation",
      "violation_type": "direct-service-call",
      "file_path": "apps/web/src/features/orders/components/OrderList.tsx",
      "line": 42,
      "details": "Component calls apiClient.get('/api/orders') instead of consuming useOrdersQuery hook."
    }
  ],
  "fixes_applied": [
    "Introduced useOrdersQuery hook that wraps TanStack Query; component now consumes hook output."
  ],
  "revalidated_zero": true,
  "completion_timestamp": "2025-11-12T15:22:00Z"
}
```
