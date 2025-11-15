---
id: domain-purity
name: Domain Purity Enforcement
category: domain
severity: error
enabled: true
optional: true
version: 1
group: architecture
---

HEADER
constraint_id: domain-purity
severity: error
enforcement_order: 13

PURPOSE
Keep the domain layer deterministic by prohibiting IO, framework bindings, or temporal coupling inside `src/domain/**`.

SCOPE
include_paths: ["src/domain"]
exclude_paths: ["node_modules","dist","build",".git","tests"]

DEFINITIONS
side-effect-api: clock, randomness, network, filesystem, database, console, or environment access
impure-token: global state mutation, static singleton, caching primitive tied to runtime state
domain-file: file path under 'src/domain/' excluding '__tests__'
allowed-dependency: other domain files or shared pure utilities under 'src/shared/pure/'

FORBIDDEN
- Importing infra, app, ui, or framework packages from domain files
- Importing Zod or validation libraries directly in domain entities (Zod schemas belong in `packages/shared-types`; see `shared-types-zod-source-of-truth` constraint)
- Reading from process.env, Date.now, Math.random, crypto, or console APIs inside domain functions
- Relying on ORMs, HTTP clients, or persistence models inside domain logic
- Writing to mutable singletons or maintaining module-level caches

ALLOWED
- Pure computations, value-object factories, and aggregate methods
- Dependency inversion via ports where the port interface lives under `src/domain/ports`
- Plain TypeScript types and interfaces for domain entities (no Zod, no decorators)
- Immutable configuration objects injected via arguments
- Usage of shared constants/helpers that themselves avoid side effects
- Importing TypeScript types inferred from Zod schemas in shared-types (e.g., `import type { Contact } from '@shared-types'`)

REQUIRED DATA COLLECTION
domain_imports: {
  file_path: string;
  line: number;
  specifier: string;
  resolved_layer: 'domain' | 'app' | 'infra' | 'ui' | 'shared' | 'external';
}[]
side_effect_calls: {
  file_path: string;
  line: number;
  expression: string;
  reason: string;
}[]
impure_patterns: {
  file_path: string;
  line: number;
  pattern: 'singleton' | 'mutable-export' | 'module-cache';
  details: string;
}[]

VALIDATION ALGORITHM (PSEUDOCODE)
detection_steps:
- Enumerate all domain files and parse their import statements, mapping each specifier to a resolved layer.
- Flag imports that reference app/ui/infra directories or any package from the disallowed SDK list (framework, ORM, HTTP clients).
- Scan AST bodies for calls to side-effect-api or usage of impure tokens (Date.now, Math.random, process.env, console.*).
- Detect exported instances or module-level stateful caches and record impure_patterns.
- Summarize violations per file with reason codes.
```
domainFiles = findFiles('src/domain', { extensions: ['ts','tsx','js'] })
for file in domainFiles:
  imports = parseImports(file)
  for imp in imports:
    targetLayer = classifySpecifier(imp)
    record domain_imports entry
    if targetLayer in ['app','infra','ui'] or imp.package in disallowedPackages:
      violations.append({ type: 'forbidden-import', ... })

  ast = parseAst(file)
  if ast.uses(['process.env','Date.now','Math.random','crypto','console']):
    side_effect_calls.append({
      file_path: file,
      line: ast.node.line,
      expression: ast.node.text,
      reason: 'side-effect-api'
    })
  if ast.exportsMutableSingleton():
    impure_patterns.append({ ... })
```

REPORTING CONTRACT
REQUIRED keys: constraint_id, violation_type, file_path, line, details. Optional keys: specifier, resolved_layer, expression, reason. Provide one record per forbidden import, side effect, or impure pattern.

FIX SEQUENCE (STRICT)
1. Remove forbidden imports by moving IO and framework access into app/infra layers or injecting them through port interfaces.
2. Replace direct side-effect calls with abstractions: supply time/randomness/ids as parameters from callers.
3. Eliminate module-level singletons by returning factory functions or pure builders.
4. Re-run validation to ensure domain files depend only on other domain modules or shared pure helpers.

REVALIDATION LOOP
```
attempts = 0
do:
  rerun detection
  attempts += 1
while (violations remain && attempts < 2)
```

SUCCESS CRITERIA (MUST)
- No forbidden domain_imports referencing non-domain layers
- side_effect_calls array empty
- impure_patterns array empty
- All domain exports remain pure and deterministic

FAILURE HANDLING
Escalate to architecture owner when domain logic cannot be decoupled because upstream contracts demand concrete infra behavior; document blockers in the final report.

COMMON MISTAKES
- Pulling validation helpers from app services into the domain and leaving HTTP clients attached
- Generating UUIDs directly inside aggregates instead of accepting them as arguments
- Reading env vars during domain construction

POST-FIX ASSERTIONS
- Domain modules accept data and collaborators via parameters
- No console, clock, randomness, or IO APIs exist in src/domain/**
- Shared utilities imported by domain are themselves side-effect free

FINAL REPORT SAMPLE
```
{
  "constraint_id": "domain-purity",
  "violations": [
    {
      "constraint_id": "domain-purity",
      "violation_type": "side-effect-api",
      "file_path": "src/domain/orders/Order.ts",
      "line": 32,
      "details": "Order aggregate calls Date.now() when creating shipments."
    }
  ],
  "fixes_applied": [
    "Injected clock interface via constructor and removed direct Date.now usage."
  ],
  "revalidated_zero": true,
  "completion_timestamp": "2025-11-12T15:12:00Z"
}
```
