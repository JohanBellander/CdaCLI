---
id: ports-and-adapters-integrity
name: Ports and Adapters Integrity
category: architecture-ports
severity: error
enabled: true
optional: true
version: 1
group: patterns
---

HEADER
constraint_id: ports-and-adapters-integrity
severity: error
enforcement_order: 14

PURPOSE
Ensure app services depend on domain ports, ports stay interface-only, and infra adapters implement those ports without leaking concrete dependencies upstream.

SCOPE
include_paths: ["src/domain/ports","src/app","src/infra/adapters"]
exclude_paths: ["node_modules","dist","build",".git","tests"]

DEFINITIONS
port-interface: TypeScript interface/type alias defined under 'src/domain/ports'
adapter-class: concrete implementation located under 'src/infra/adapters'
app-module: file inside 'src/app/' excluding 'presenters' already validated elsewhere
implements-contract: adapter declares `implements <Port>` or satisfies the exported type

FORBIDDEN
- Ports exporting classes, newable types, or concrete implementations
- App modules importing adapter implementation paths instead of ports
- Adapter classes omitting `implements` references to their associated ports
- Ports never referenced by any adapter (orphans) or adapters lacking a referenced port

ALLOWED
- Domain ports exporting interfaces, types, enums, and constants required for contracts
- App modules importing ports and receiving adapters via dependency injection
- Infra adapters using additional helper modules as long as they implement the declared port
- Multiple adapters implementing the same port for different technologies

REQUIRED DATA COLLECTION
ports_catalog: {
  file_path: string;
  export_name: string;
  export_kind: 'interface' | 'type' | 'class' | 'function';
}[]
app_imports: {
  file_path: string;
  line: number;
  specifier: string;
  resolves_to: 'port' | 'adapter' | 'unknown';
}[]
adapter_implements: {
  file_path: string;
  class_name: string;
  implements_ports: string[];
}[]
orphan_ports: string[]
unbound_adapters: string[]

VALIDATION ALGORITHM (PSEUDOCODE)
detection_steps:
- Catalog every export under `src/domain/ports` and ensure export_kind is interface/type; record violations for classes/functions.
- Parse app modules to resolve imports; mark any specifier pointing to `src/infra/adapters` as violation `app-imports-adapter`.
- Inspect adapter classes to confirm they declare `implements <Port>` or satisfy the port type via assignment.
- Compute orphan_ports by finding ports with zero adapters referencing them; compute unbound_adapters when adapters implement nothing.
- Produce violation entries for each rule breach.
```
ports = findExports('src/domain/ports')
for port in ports:
  ports_catalog.append(port)
  if port.export_kind not in ['interface','type']:
    violations.append({
      type: 'port-not-interface',
      file_path: port.file_path,
      line: port.line,
      details: 'Ports must export interfaces or types only.'
    })

appFiles = findFiles('src/app')
for file in appFiles:
  imports = parseImports(file)
  for imp in imports:
    resolved = resolvePath(imp.specifier)
    if resolved.startsWith('src/infra/adapters'):
      violations.append({ type: 'app-imports-adapter', ... })

adapterFiles = findFiles('src/infra/adapters')
for file in adapterFiles:
  classes = findClasses(file)
  for cls in classes:
    implemented = findImplements(cls)
    adapter_implements.append({
      file_path: file,
      class_name: cls.name,
      implements_ports: implemented
    })
    if implemented.isEmpty():
      unbound_adapters.add(cls.name)

orphan_ports = ports.names - union(adapter_implements.implements_ports)
```

REPORTING CONTRACT
REQUIRED keys: constraint_id, violation_type, file_path, line, details. Optional keys: export_name, class_name, specifier, implements_ports. Each orphan port must produce its own violation entry.

FIX SEQUENCE (STRICT)
1. Convert concrete exports under `src/domain/ports` into interface/type definitions and move implementations elsewhere.
2. Update app modules to depend on ports and receive adapters via constructors, factories, or DI containers.
3. Modify each adapter class to explicitly implement its corresponding port and satisfy all required methods.
4. Remove unused ports or create adapters to fulfill them, documenting the mapping in fixes_applied.

REVALIDATION LOOP
```
for attempt in 1..2:
  rerun detection
  if no violations: break
```

SUCCESS CRITERIA (MUST)
- No app modules import adapter paths directly
- Every port export is interface/type-only
- Every adapter implements at least one port and all ports referenced by app modules have adapters
- orphan_ports and unbound_adapters arrays empty

FAILURE HANDLING
If upstream architectural decisions require an adapter to be imported directly, capture the rationale and mark the port for redesign via a follow-up issue rather than waiving the violation silently.

COMMON MISTAKES
- Leaving default exports in ports that implicitly create classes
- Forgetting to update barrel files so app modules still import adapters indirectly
- Assuming TypeScript structural typing removes the need for `implements` declarations

POST-FIX ASSERTIONS
- Ports directory contains contracts only, with no side-effectful code
- App layer interacts strictly with ports; adapters are injected at composition roots
- Infra adapters advertise the ports they fulfill via explicit implements clauses

FINAL REPORT SAMPLE
```
{
  "constraint_id": "ports-and-adapters-integrity",
  "violations": [
    {
      "constraint_id": "ports-and-adapters-integrity",
      "violation_type": "app-imports-adapter",
      "file_path": "src/app/services/BillingService.ts",
      "line": 12,
      "details": "Service imports '../infra/adapters/StripeAdapter' instead of the BillingPort."
    }
  ],
  "fixes_applied": [
    "BillingService now depends on BillingPort injected from composition root; StripeAdapter implements BillingPort."
  ],
  "revalidated_zero": true,
  "completion_timestamp": "2025-11-12T15:14:00Z"
}
```
