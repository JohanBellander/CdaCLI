---
id: ui-isolation
name: UI Isolation from Services
category: presentation
severity: error
enabled: true
optional: true
version: 1
---

HEADER
constraint_id: ui-isolation
severity: error
enforcement_order: 18

PURPOSE
Ensure UI components interact only with presenters, view-models, or state stores and never reach directly into domain, infra, or HTTP/database services.

SCOPE
include_paths: ["src/ui"]
additional_presenter_paths: ["src/app/presenters","src/app/view-models","src/ui/state"]
exclude_paths: ["node_modules","dist","build",".git","tests"]

DEFINITIONS
ui-component: any React/Vue/Svelte component, template, or view under `src/ui`
presenter-module: file located in additional_presenter_paths
direct-service-call: invocation of fetch/axios/graphql client or imports from domain/infra

FORBIDDEN
- UI components importing modules from `src/domain` or `src/infra`
- Direct calls to fetch, axios, graphql-request, or raw repositories
- Complex business branching (>3 decision points) inside a UI component
- Accessing global singletons (event buses, stores) without going through presenters

ALLOWED
- UI components importing presenters/view-models/hooks that encapsulate business logic
- Invoking local state containers under `src/ui/state/**` that wrap presenters
- Using lightweight formatting helpers or constants from shared utilities
- Test-only mocks defined under `src/ui/__mocks__`

REQUIRED DATA COLLECTION
ui_imports: {
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
- Parse imports within `src/ui/**` components and classify resolved_layer; flag anything referencing domain/infra directories.
- Analyze AST bodies for calls to known service APIs (fetch, axios.*, graphqlClient.*, repository.*) and record service_calls.
- Count conditional nodes per component render function; flag components exceeding decision_points > 3.
- Report each breach with file, line, and remediation hint.
```
uiFiles = findFiles('src/ui', { extensions: ['tsx','ts','js','jsx'] })
for file in uiFiles:
  imports = parseImports(file)
  for imp in imports:
    target = resolveLayer(imp.specifier)
    ui_imports.append({ file_path: file, line: imp.line, specifier: imp.specifier, resolved_layer: target })
    if target in ['domain','infra']:
      violations.append({ type: 'forbidden-import', ... })
  ast = parseAst(file)
  calls = findServiceCalls(ast)
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
1. Extract business logic out of UI components into presenters/view-models and inject them via hooks or props.
2. Replace direct service calls with presenter methods or application services invoked through the presenter.
3. Simplify render branching by moving decision-heavy code into selectors or presenter-provided state.
4. Add UI tests verifying the presenter contract to guard against regressions.

REVALIDATION LOOP
```
rerun detection steps until no forbidden imports or service_calls remain (max 2 attempts)
```

SUCCESS CRITERIA (MUST)
- ui_imports targeting domain/infra equals zero
- service_calls array empty within UI files
- branching_complexity entries <= 3 decision points

FAILURE HANDLING
If a UI framework mandates data fetching within components (e.g., Next.js getServerSideProps), limit those files to framework boundaries and document the exception paths explicitly in the report.

COMMON MISTAKES
- Adding feature flags and branching directly in JSX instead of moving them to presenters
- Importing repositories into hooks because they appear convenient
- Copying server utilities into UI components for experiments without proper staging

POST-FIX ASSERTIONS
- UI components receive all data via props/view-models
- No HTTP or persistence logic resides in `src/ui/**`
- Render functions remain declarative with minimal branching

FINAL REPORT SAMPLE
```
{
  "constraint_id": "ui-isolation",
  "violations": [
    {
      "constraint_id": "ui-isolation",
      "violation_type": "direct-service-call",
      "file_path": "src/ui/components/OrderList.tsx",
      "line": 42,
      "details": "Component calls fetch('/api/orders') instead of invoking OrderListPresenter."
    }
  ],
  "fixes_applied": [
    "Introduced OrderListPresenter hook that encapsulates fetch logic; component now consumes presenter output."
  ],
  "revalidated_zero": true,
  "completion_timestamp": "2025-11-12T15:22:00Z"
}
```

