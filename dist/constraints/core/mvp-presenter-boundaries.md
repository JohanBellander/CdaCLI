---
id: mvp-presenter-boundaries
name: MVP Presenter Boundaries
category: architecture-pattern
severity: error
enabled: false
optional: true
version: 1
group: patterns
---

HEADER
constraint_id: mvp-presenter-boundaries
severity: error
enforcement_order: 10

PURPOSE
Maintain clear separation between Model-View-Presenter responsibilities so presenters coordinate state, views handle rendering, and models encapsulate data logic without cross-layer leakage. React+Next teams generally rely on feature hooks instead of presenters, so leave this constraint disabled unless you are intentionally adopting MVP in another UI framework.

SCOPE
include_paths: any file path containing '/presenters/' or '/views/' or '/models/'
exclude_paths: ["node_modules","dist","build",".git"]

DEFINITIONS
layer(presenter): path contains '/presenters/'
layer(view): path contains '/views/'
layer(model): path contains '/models/'
view-interface: TypeScript interface or abstract class declaring view update methods consumed by presenters
stateful-logic: business rules, validation, API orchestration, or persistence logic that changes application state
declares-view-interface(file): presenter exports at least one interface or abstract base class consumed by the view layer

FORBIDDEN
- Missing presenter, view, or model layers in codebases claiming MVP usage
- Presenters depending on concrete view classes instead of view-interface contracts
- Views invoking presenter constructors or manipulating models directly
- Views invoking stateful-logic other than UI formatting (date formatting, localization allowed)
- Models importing presenters or views

ALLOWED
- Presenters owning stateful-logic, calling models, and updating views through interfaces
- Views implementing view-interface methods and raising user events via callbacks
- Models encapsulating domain logic, validation, and persistence orchestration
- Shared utilities imported via shared modules (e.g., '/shared/', '/lib/')

REQUIRED DATA COLLECTION
presenters: string[]
views: string[]
models: string[]
violations_mvp: {
  layer: 'presenter' | 'view' | 'model';
  violation_type:
    | 'missing-layer'
    | 'presenter-uses-concrete-view'
    | 'missing-view-interface'
    | 'view-stateful-logic'
    | 'view-calls-model'
    | 'model-imports-presenter-view';
  file_path: string;
  line: number;
  details: string;
}[]

VALIDATION ALGORITHM (PSEUDOCODE)
detection_steps:
- Ensure presenter, view, and model layers exist and contain implementations; emit missing-layer violations when absent.
- List presenter files and inspect constructor dependencies for concrete view classes; flag when no view-interface or inversion present.
- Inspect presenter files to ensure they export interfaces or types for views to implement.
- Scan view files for imports from models or presenters and for stateful-logic occurrences.
- Inspect model files to confirm they do not import presenters or views.
```
presenters = findFiles('/presenters/')
views = findFiles('/views/')
models = findFiles('/models/')

if presenters.length == 0:
    violations_mvp.append({
        layer: 'presenter',
        violation_type: 'missing-layer',
        file_path: 'src/presenters',
        line: 0,
        details: 'No presenter-layer implementations detected. MVP requires presenters coordinating state.'
    })
if models.length == 0:
    violations_mvp.append({
        layer: 'model',
        violation_type: 'missing-layer',
        file_path: 'src/models',
        line: 0,
        details: 'No model-layer implementations detected for MVP enforcement.'
    })
if views.length == 0:
    violations_mvp.append({
        layer: 'view',
        violation_type: 'missing-layer',
        file_path: 'src/views',
        line: 0,
        details: 'No view-layer implementations detected for MVP enforcement.'
    })

for file in presenters:
    if dependsOnConcreteView(file):
        violations_mvp.append({
            layer: 'presenter',
            violation_type: 'presenter-uses-concrete-view',
            file_path: file,
            line: detectLine(file, 'new ViewClass'),
            details: 'Presenter instantiates or imports concrete view instead of relying on interface.'
        })
    if not declaresViewInterface(file):
        violations_mvp.append({
            layer: 'presenter',
            violation_type: 'missing-view-interface',
            file_path: file,
            line: detectLine(file, 'export interface'),
            details: 'Presenter does not expose a view interface contract for implementation.'
        })

for file in views:
    if callsModelDirectly(file):
        violations_mvp.append({
            layer: 'view',
            violation_type: 'view-calls-model',
            file_path: file,
            line: detectLine(file, 'model call'),
            details: 'View invokes model rather than delegating through presenter.'
        })
    if performsStatefulLogic(file):
        violations_mvp.append({
            layer: 'view',
            violation_type: 'view-stateful-logic',
            file_path: file,
            line: detectLine(file, 'stateful logic'),
            details: 'View contains business logic or persistence.'
        })

for file in models:
    if importsPresenterOrView(file):
        violations_mvp.append({
            layer: 'model',
            violation_type: 'model-imports-presenter-view',
            file_path: file,
            line: detectLine(file, 'presenter/view import'),
            details: 'Model should not reference presenter or view layer.'
        })
```

REPORTING CONTRACT
REQUIRED keys: constraint_id, layer, violation_type, file_path, line, details.
Each violation MUST include those fields. Sort violations by layer order (presenter, view, model) then file_path ASC then line ASC. Optional keys allowed: `notes`, `remediation_plan`, `dispute_reason`.

FIX SEQUENCE (STRICT)
1. Create or restore presenter, view, and model layers with concrete implementations and shared contracts.
2. Introduce or refactor view interfaces so presenters depend on contracts rather than concrete view classes.
3. Move any view-internal stateful-logic into presenters or models, leaving only rendering and event forwarding.
4. Remove direct model dependencies from views by injecting callbacks supplied by presenters.
5. Eliminate presenter/view imports from models, relocating shared concerns into models or shared utilities.
6. Record adjustments in fixes_applied documenting interface introductions and refactoring steps.

REVALIDATION LOOP
```
for attempt in 1..2:
    rerun VALIDATION ALGORITHM
    if violations_mvp is empty:
        break
if violations_mvp not empty:
    status = 'failed'
```

SUCCESS CRITERIA (MUST)
- violations_mvp array empty
- Presenter, view, and model layers contain at least one implementation file each
- All presenter dependencies on views go through interfaces or injected callbacks
- Every presenter exposes a view-interface contract implemented by the view layer
- Views contain only rendering logic and event wiring
- revalidated_zero equals true

FAILURE HANDLING
If violations remain, emit failure status and highlight unresolved files grouped by layer in the remediation summary.

COMMON MISTAKES
- Registering presenters as singletons that internally instantiate views
- Allowing views to orchestrate API calls directly while presenters remain passive
- Treating view interfaces as optional documentation instead of hard dependencies

POST-FIX ASSERTIONS
- Presenters own state management, orchestrating models and pushing updates to views via interfaces
- Views implement interfaces, trigger callbacks, and avoid domain decisions
- Models stay independent from presenters and views

FINAL REPORT SAMPLE
```
{
  "constraint_id": "mvp-presenter-boundaries",
  "violations": [
    {
      "constraint_id": "mvp-presenter-boundaries",
      "layer": "view",
      "file_path": "src/views/AccountView.tsx",
      "line": 72,
      "violation_type": "view-stateful-logic",
      "details": "AccountView calls AccountRepository.save directly instead of delegating to the presenter."
    }
  ],
  "fixes_applied": [
    "Moved persistence call into AccountPresenter and exposed onSave callback to the view."
  ],
  "revalidated_zero": true,
  "completion_timestamp": "2025-11-09T14:10:00Z"
}
```
