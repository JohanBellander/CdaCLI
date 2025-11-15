---
id: clean-layer-direction
name: Clean Layer Direction
category: architecture-layering
severity: error
enabled: true
optional: true
version: 1
group: architecture
---

HEADER
constraint_id: clean-layer-direction
severity: error
enforcement_order: 12

PURPOSE
Guarantee that dependencies always flow from UI ➜ App ➜ Domain ➜ Infra and that shared utilities never skip layers or re-import lower abstractions.

SCOPE
include_paths: ["src/ui","src/app","src/domain","src/infra","src/shared"]
exclude_paths: ["node_modules","dist","build",".git","tests","src/composition","src/main.ts","src/index.ts","src/bootstrap.ts"]

DEFINITIONS
composition-root: file path matches 'src/index.ts', 'src/main.ts', 'src/bootstrap.ts', or starts with 'src/composition/'
layer(ui): file path starts with 'src/ui/'
layer(app): file path starts with 'src/app/'
layer(domain): file path starts with 'src/domain/'
layer(infra): file path starts with 'src/infra/'
layer(shared): file path starts with 'src/shared/' or 'src/common/'
dependency(edge): directed import from source file to target file
downstream-layer(source,target): true when source layer ranks lower than target in ordering [ui, app, domain, infra]

FORBIDDEN
- ui layer importing domain, infra, or shared implementations directly
- app layer importing infra unless the file resides in adapters explicitly annotated
- domain layer importing app or ui code (domain must remain dependency-free)
- infra layer importing app code (infra should only implement domain ports)
- shared utilities importing infra or app specific modules
- cyclic dependencies between any two layers

ALLOWED
- composition roots (src/index.ts, src/main.ts, src/bootstrap.ts, src/composition/**) importing from ALL layers for dependency injection wiring
- ui importing presenters/view-models located under src/app/presenters or src/app/view-models
- app importing domain services, value objects, and ports
- domain importing shared immutable utilities (types, constants) with no side effects
- infra implementing domain ports and importing domain entities, ports, and value objects (EXPECTED: adapters depend on domain interfaces)
- infra importing shared helpers for utilities like logging, telemetry, or config
- shared utilities importing only other shared files

REQUIRED DATA COLLECTION
layers_detected: { layer: 'ui' | 'app' | 'domain' | 'infra' | 'shared'; files: string[]; }[]
layer_dependencies: {
  source_layer: 'ui' | 'app' | 'domain' | 'infra' | 'shared';
  target_layer: 'ui' | 'app' | 'domain' | 'infra' | 'shared';
  file_path: string;
  line: number;
  specifier: string;
}[]
cycles_detected: { path: string[]; files: string[]; }[]

VALIDATION ALGORITHM (PSEUDOCODE)
detection_steps:
- Determine each source file's layer classification using DEFINITIONS and ensure every layer has at least one implementation to confirm coverage.
- Build an import graph across all classified files and compute layer_dependencies with resolved source/target layers.
- Flag any dependency whose source_layer ranks lower (later) than target_layer or violates allowed adapters list.
- Run cycle detection across the import graph limited to classified nodes and record any strongly connected components larger than one.
- Summarize violations with precise file_path, line, specifier, source_layer, and target_layer details.
```
layers = {
  ui: findFiles('src/ui'),
  app: findFiles('src/app'),
  domain: findFiles('src/domain'),
  infra: findFiles('src/infra'),
  shared: findFiles(['src/shared','src/common'])
}

for each file in union(layers.*):
  imports = parseImports(file)
  for each imp in imports:
    targetLayer = resolveLayer(imp.resolvedPath)
    if !targetLayer: continue
    record layer_dependencies entry
    
    # infra→domain is ALLOWED (adapters implement domain ports)
    if sourceLayer == 'infra' and targetLayer == 'domain':
      continue  # Valid dependency
    
    if order(sourceLayer) > order(targetLayer):
      record violation 'downstream-layer'
    if sourceLayer == 'domain' and targetLayer in ['app','ui']:
      record violation 'domain-imports-upstream'
    if sourceLayer == 'infra' and targetLayer == 'app':
      record violation 'infra-imports-app'
    if sourceLayer == 'ui' and targetLayer in ['domain','infra']:
      record violation 'ui-imports-forbidden'
    if sourceLayer == 'shared' and targetLayer not in ['shared','domain']:
      record violation 'shared-imports-forbidden'

cycles = findStronglyConnectedComponents(importGraph)
for each cycle in cycles where size>1:
  cycles_detected.append({ path: cycle.nodes, files: cycle.files })
```

REPORTING CONTRACT
REQUIRED keys: constraint_id, violation_type, source_layer, target_layer, file_path, line, specifier. Optional keys allowed: cycle_path, adapter_note, remediation_hint. Sort records by enforcement_order then file_path ASC.

FIX SEQUENCE (STRICT)
1. Break any detected cycles by extracting shared abstractions or introducing ports so that dependency arrows flow one direction.
2. Refactor ui/app/domain files to import only from the immediately lower layer or approved shared utilities; move offending logic to compliant modules.
3. Update infra adapters to implement domain ports rather than being imported directly by app/ui.
4. Document all fixes in fixes_applied with before/after layer ownership.

REVALIDATION LOOP
```
rerun VALIDATION ALGORITHM up to 2 times or until layer_dependencies violations and cycles_detected arrays are empty.
```

SUCCESS CRITERIA (MUST)
- No layer_dependencies entries violate the approved direction table
- cycles_detected array is empty
- ui files import only presenters/view-models or shared utilities
- domain files import only domain peers or shared utilities

FAILURE HANDLING
If violations persist after remediation attempts, stop work and log the blocking files along with the unresolved dependency edges so owners can review architectural exceptions.

COMMON MISTAKES
- Treating shared utilities as permission to access infra clients
- Allowing infra data mappers to leak back into app services
- Forgetting to update index barrels that still export forbidden modules

POST-FIX ASSERTIONS
- Dependency graph is acyclic and respects ui ➜ app ➜ domain ➜ infra order
- Shared utilities remain side-effect free and layer-agnostic
- Infra modules expose ports/adapters instead of being imported upstream

FINAL REPORT SAMPLE
```
{
  "constraint_id": "clean-layer-direction",
  "violations": [
    {
      "constraint_id": "clean-layer-direction",
      "violation_type": "ui-imports-forbidden",
      "source_layer": "ui",
      "target_layer": "infra",
      "file_path": "src/ui/pages/Dashboard.tsx",
      "line": 27,
      "specifier": "../infra/adapters/HttpClient"
    }
  ],
  "fixes_applied": [
    "Updated Dashboard to depend on DashboardPresenter (src/app/presenters/DashboardPresenter.ts) and injected network calls through the presenter."
  ],
  "revalidated_zero": true,
  "completion_timestamp": "2025-11-12T15:10:00Z"
}
```
