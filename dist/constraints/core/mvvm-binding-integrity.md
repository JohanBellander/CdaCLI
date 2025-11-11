---
id: mvvm-binding-integrity
name: MVVM Binding Integrity
category: architecture-pattern
severity: error
enabled: true
version: 1
---

HEADER
constraint_id: mvvm-binding-integrity
severity: error
enforcement_order: 11

PURPOSE
Guarantee Model-View-ViewModel boundaries by enforcing one-way dependencies, keeping view models free of view references, and ensuring views bind without business logic.

SCOPE
include_paths: any file path containing '/viewmodels/' or '/views/' or '/models/'
exclude_paths: ["node_modules","dist","build",".git"]

DEFINITIONS
layer(viewmodel): path contains '/viewmodels/'
layer(view): path contains '/views/'
layer(model): path contains '/models/'
view-binding: template bindings, reactive subscriptions, observer wiring, or explicit command hookups between view and viewmodel
ui-thread-api: DOM manipulation or framework-specific UI APIs (e.g., document, window.alert, ReactDOM)
binds-to-viewmodel(view_file, viewmodels): view file references at least one exported viewmodel symbol via binding declarations, imports, registration, or dependency injection

FORBIDDEN
- Missing viewmodel, view, or model layers in codebases adopting MVVM
- View models importing views, UI components, or DOM APIs
- Views mutating view model state outside exposed commands or bindings
- Views performing domain/business logic or data persistence
- Views omitting bindings to viewmodels (rendering without MVVM linkage)
- Models importing view models or views

ALLOWED
- View models exposing observable state, commands, and adapters for views
- Views binding to view model state and invoking commands through declarative bindings or callbacks
- Models encapsulating domain logic, persistence, and validation without referencing view-related classes
- Shared abstractions accessed via shared modules (e.g., '/shared/', '/lib/')

REQUIRED DATA COLLECTION
viewmodels: string[]
views: string[]
models: string[]
violations_mvvm: {
  layer: 'viewmodel' | 'view' | 'model';
  violation_type:
    | 'missing-layer'
    | 'viewmodel-imports-view'
    | 'view-direct-mutation'
    | 'view-business-logic'
    | 'view-missing-binding'
    | 'model-imports-viewmodel';
  file_path: string;
  line: number;
  details: string;
}[]

VALIDATION ALGORITHM (PSEUDOCODE)
detection_steps:
- Ensure viewmodel, view, and model layers each contain implementation files; record missing-layer violations when absent.
- Parse view model files to confirm imports exclude views, UI-thread-api, or DOM manipulation libraries.
- Inspect views to confirm bindings to viewmodels, flagging missing bindings, direct state mutation, or business logic/persistence.
- Inspect model files to ensure they do not import viewmodels or views.
```
viewmodels = findFiles('/viewmodels/')
views = findFiles('/views/')
models = findFiles('/models/')

if viewmodels.length == 0:
    violations_mvvm.append({
        layer: 'viewmodel',
        violation_type: 'missing-layer',
        file_path: 'src/viewmodels',
        line: 0,
        details: 'No viewmodel-layer implementations detected. MVVM requires viewmodels exposing bindings.'
    })
if models.length == 0:
    violations_mvvm.append({
        layer: 'model',
        violation_type: 'missing-layer',
        file_path: 'src/models',
        line: 0,
        details: 'No model-layer implementations detected for MVVM enforcement.'
    })
if views.length == 0:
    violations_mvvm.append({
        layer: 'view',
        violation_type: 'missing-layer',
        file_path: 'src/views',
        line: 0,
        details: 'No view-layer implementations detected for MVVM enforcement.'
    })

for file in viewmodels:
    if importsViewOrUiApi(file):
        violations_mvvm.append({
            layer: 'viewmodel',
            violation_type: 'viewmodel-imports-view',
            file_path: file,
            line: detectLine(file, 'ui import'),
            details: 'ViewModel references view layer or UI APIs.'
        })

for file in views:
    if not bindsToViewModel(file, viewmodels):
        violations_mvvm.append({
            layer: 'view',
            violation_type: 'view-missing-binding',
            file_path: file,
            line: detectLine(file, 'viewmodel binding'),
            details: 'View does not bind to any viewmodel. MVVM requires binding between view and viewmodel.'
        })
    if mutatesViewModelStateDirectly(file):
        violations_mvvm.append({
            layer: 'view',
            violation_type: 'view-direct-mutation',
            file_path: file,
            line: detectLine(file, 'state mutation'),
            details: 'View modifies viewmodel state outside exposed commands.'
        })
    if performsBusinessLogic(file):
        violations_mvvm.append({
            layer: 'view',
            violation_type: 'view-business-logic',
            file_path: file,
            line: detectLine(file, 'business logic'),
            details: 'View executes domain logic or persistence operations.'
        })

for file in models:
    if importsViewModelOrView(file):
        violations_mvvm.append({
            layer: 'model',
            violation_type: 'model-imports-viewmodel',
            file_path: file,
            line: detectLine(file, 'viewmodel/view import'),
            details: 'Model must not depend on view or viewmodel layers.'
        })
```

REPORTING CONTRACT
REQUIRED keys: constraint_id, layer, violation_type, file_path, line, details.
Each violation MUST include those fields. Sort violations by layer order (viewmodel, view, model) then file_path ASC then line ASC. Optional fields allowed: `binding_context`, `remediation_plan`, `dispute_reason`.

FIX SEQUENCE (STRICT)
1. Create or restore viewmodel, view, and model layers with concrete MVVM implementations and bindings.
2. Remove UI or view imports from view models, replacing them with platform-agnostic adapters or command abstractions.
3. Refactor views so all state changes occur via viewmodel commands or bindings; eliminate direct mutation of viewmodel internals.
4. Move any business logic or persistence currently in views into viewmodels or models as appropriate.
5. Detach models from view/viewmodel imports by relocating shared concerns to shared modules or adapters.
6. Document each change inside fixes_applied detailing files adjusted and binding changes.

REVALIDATION LOOP
```
for attempt in 1..2:
    rerun VALIDATION ALGORITHM
    if violations_mvvm is empty:
        break
if violations_mvvm not empty:
    status = 'failed'
```

SUCCESS CRITERIA (MUST)
- violations_mvvm array empty
- Viewmodel, view, and model layers each contain at least one implementation file
- Every view binds to a viewmodel through declarative bindings or exposed commands
- View models depend only on models/shared utilities, never on views or UI APIs
- Views bind declaratively without business logic or direct state mutation
- revalidated_zero equals true

FAILURE HANDLING
Report failure when violations persist after remediation, grouping outstanding issues by layer and providing guidance on missing abstractions.

COMMON MISTAKES
- Allowing view models to call DOM APIs for navigation or alerts
- Letting views mutate viewmodel state directly instead of invoking commands
- Forgetting to move validation or persistence logic from views into viewmodels or models

POST-FIX ASSERTIONS
- View models expose state and commands independent of UI frameworks
- Views bind to viewmodel state and trigger commands without domain logic
- Models remain UI-agnostic and interact only with domain concerns

FINAL REPORT SAMPLE
```
{
  "constraint_id": "mvvm-binding-integrity",
  "violations": [
    {
      "constraint_id": "mvvm-binding-integrity",
      "layer": "viewmodel",
      "file_path": "src/viewmodels/TodoViewModel.ts",
      "line": 15,
      "violation_type": "viewmodel-imports-view",
      "details": "TodoViewModel imports React components and manipulates DOM APIs."
    }
  ],
  "fixes_applied": [
    "Introduced NotificationService adapter and removed React component imports from TodoViewModel."
  ],
  "revalidated_zero": true,
  "completion_timestamp": "2025-11-09T14:15:00Z"
}
```
