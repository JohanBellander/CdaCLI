---
id: mvc-layer-separation
name: MVC Layer Separation
category: architecture-pattern
severity: error
enabled: true
version: 1
---

HEADER
constraint_id: mvc-layer-separation
severity: error
enforcement_order: 9

PURPOSE
Ensure Model-View-Controller responsibilities remain isolated so controllers orchestrate requests, models encapsulate domain logic, and views render presentation only.

SCOPE
include_paths: any file path containing '/controllers/' or '/models/' or '/views/'
exclude_paths: ["node_modules","dist","build",".git"]

DEFINITIONS
layer(controller): file path contains '/controllers/' segment
layer(model): file path contains '/models/' segment
layer(view): file path contains '/views/' segment
data-access-api: repository, ORM, SQL, HTTP, or persistence helper import used for data access
presentation-api: template helpers, JSX/TSX rendering functions, DOM manipulation, styling utilities
cross-layer-import(layer_a, layer_b): file in layer_a importing a symbol from layer_b

FORBIDDEN
- Missing controller, model, or view layers in codebases adopting MVC
- Controllers invoking data-access-api directly instead of delegating to models or services
- Controllers importing view implementation files (templates, CSS, JSX) rather than rendering via contracts
- Models importing controllers or views
- Views performing business logic, state mutations, or direct data access (repositories, HTTP clients)

ALLOWED
- Controllers orchestrating requests by invoking models/services and choosing views
- Models encapsulating business rules, validation, and persistence orchestration
- Views rendering data received from controllers without introducing new business decisions
- Shared utilities accessed via dedicated shared modules (e.g., '/shared/' or '/common/')

REQUIRED DATA COLLECTION
controllers: string[]
models: string[]
views: string[]
violations_mvc: {
  layer: 'controller' | 'model' | 'view';
  violation_type:
    | 'missing-layer'
    | 'data-access-in-controller'
    | 'controller-imports-view'
    | 'model-cross-layer'
    | 'view-business-logic';
  file_path: string;
  line: number;
  details: string;
}[]

VALIDATION ALGORITHM (PSEUDOCODE)
detection_steps:
- Ensure controller, model, and view layers each contain at least one implementation file; record missing-layer violations before deeper analysis.
- Enumerate controller files, parse imports, and flag data-access-api usage or direct imports from '/views/'.
- Enumerate model files and flag imports referencing controllers or views.
- Enumerate view files and flag occurrences of data-access-api usage or business logic keywords (calculations, validation, repository calls).
- Aggregate every breach into violations_mvc with precise line numbers and context details.
```
controllers = findFiles('/controllers/')
models = findFiles('/models/')
views = findFiles('/views/')

if controllers.length == 0:
    violations_mvc.append({
        layer: 'controller',
        violation_type: 'missing-layer',
        file_path: 'src/controllers',
        line: 0,
        details: 'No controller-layer implementations detected. MVC requires controllers orchestrating requests.'
    })
if models.length == 0:
    violations_mvc.append({
        layer: 'model',
        violation_type: 'missing-layer',
        file_path: 'src/models',
        line: 0,
        details: 'No model-layer implementations detected. MVC requires models encapsulating domain logic.'
    })
if views.length == 0:
    violations_mvc.append({
        layer: 'view',
        violation_type: 'missing-layer',
        file_path: 'src/views',
        line: 0,
        details: 'No view-layer implementations detected. MVC requires views rendering presentation.'
    })

for file in controllers:
    imports = parseImports(file)
    if usesDataAccessApi(file):
        violations_mvc.append({
            layer: 'controller',
            violation_type: 'data-access-in-controller',
            file_path: file,
            line: detectLine(file, 'data-access'),
            details: 'Controller invokes persistence logic directly instead of delegating to a model/service.'
        })
    if importsViewImplementation(imports):
        violations_mvc.append({
            layer: 'controller',
            violation_type: 'controller-imports-view',
            file_path: file,
            line: detectLine(file, 'view import'),
            details: 'Controller imports a concrete view module instead of targeting a rendering contract.'
        })

for file in models:
    if importsControllerOrView(file):
        violations_mvc.append({
            layer: 'model',
            violation_type: 'model-cross-layer',
            file_path: file,
            line: detectLine(file, 'controller/view import'),
            details: 'Model references controller or view code instead of remaining domain-focused.'
        })

for file in views:
    if usesDataAccessApi(file) or performsBusinessLogic(file):
        violations_mvc.append({
            layer: 'view',
            violation_type: 'view-business-logic',
            file_path: file,
            line: detectLine(file, 'business logic'),
            details: 'View performs data access or business calculations.'
        })
```

REPORTING CONTRACT
REQUIRED keys: constraint_id, layer, violation_type, file_path, line, details.
Each violation MUST include those fields. Sort by layer order (controller, model, view), then file_path ASC, then line ASC. Optional keys allowed: `remediation_notes`, `disputed`, `dispute_reason`.

FIX SEQUENCE (STRICT)
1. Scaffold missing MVC layers so controllers, models, and views each have concrete implementations.
2. Extract persistence logic from controllers into models or services, leaving controllers with orchestration only.
3. Replace direct controller-to-view imports with rendering contracts (interfaces or factories) that view implementations satisfy.
4. Remove controller/view imports from models by relocating shared logic into models/services.
5. Refactor views to accept fully prepared data from controllers and eliminate state mutations or persistence calls.
6. Document each fix in fixes_applied with affected files and responsibility relocations.

REVALIDATION LOOP
```
for attempt in 1..2:
    rerun VALIDATION ALGORITHM
    if violations_mvc is empty:
        break
if violations_mvc not empty:
    status = 'failed'
```

SUCCESS CRITERIA (MUST)
- violations_mvc array is empty after remediation
- Controllers, models, and views layers each contain at least one implementation file
- Controllers contain orchestration only (no data-access-api usage remains)
- Views contain presentation logic only
- revalidated_zero equals true

FAILURE HANDLING
If violations persist after the second attempt, report status: failed and identify blocking controllers/models/views in the remediation summary.

COMMON MISTAKES
- Introducing thin service wrappers in controllers but leaving persistence logic there
- Allowing template helpers in views to re-fetch data from APIs
- Treating models as passive data structures instead of encapsulating business logic

POST-FIX ASSERTIONS
- Controllers delegate domain logic to models or services and select views via contracts
- Models expose domain methods consumed by controllers without referencing views
- Views render data passed by controllers without side effects or persistence

FINAL REPORT SAMPLE
```
{
  "constraint_id": "mvc-layer-separation",
  "violations": [
    {
      "constraint_id": "mvc-layer-separation",
      "layer": "controller",
      "file_path": "src/controllers/UserController.ts",
      "line": 48,
      "violation_type": "data-access-in-controller",
      "details": "Controller invokes UserRepository directly instead of delegating to a model/service."
    }
  ],
  "fixes_applied": [
    "Moved persistence logic from UserController into UserModel.persist and injected the model into the controller."
  ],
  "revalidated_zero": true,
  "completion_timestamp": "2025-11-09T14:05:00Z"
}
```
