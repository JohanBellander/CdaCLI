---
id: api-boundary-hygiene
name: API Boundary Hygiene
category: application-layer
severity: error
enabled: true
optional: true
version: 1
group: contracts
---

HEADER
constraint_id: api-boundary-hygiene
severity: error
enforcement_order: 19

PURPOSE
Keep HTTP/controllers transport concerns isolated by ensuring DTOs never leak domain entities, persistence models stay hidden, and every request flows through application services plus dedicated mappers.

SCOPE
include_paths: ["src/app/controllers","src/app/http","src/domain","src/infra/persistence"]
exclude_paths: ["node_modules","dist","build",".git","tests"]

DEFINITIONS
controller-file: file under `src/app/controllers` or `src/app/http`
dto: request/response data shape defined under controllers/http layer
mapper-module: file containing `toDomain`, `fromDomain`, or similar translation helpers
direct-domain-return: controller returns a domain class instance instead of DTO

FORBIDDEN
- Controllers importing persistence models or infra repositories directly
- Returning domain entities (objects from `src/domain/**`) from controller handlers
- Missing mapper usage when converting between DTOs and domain models
- Controllers bypassing application services and invoking domain aggregates directly

ALLOWED
- Controllers orchestrating request validation, invoking application services, and returning DTOs
- Mappers defined either next to controllers or under `src/app/mappers`
- Lightweight data shaping inside controllers that does not expose domain internals

REQUIRED DATA COLLECTION
controller_imports: {
  file_path: string;
  line: number;
  specifier: string;
  resolved_layer: string;
}[]
domain_returns: {
  file_path: string;
  line: number;
  return_type: string;
}[]
mapper_usage: {
  file_path: string;
  mapper_file: string | null;
  status: 'used' | 'missing';
}[]

VALIDATION ALGORITHM (PSEUDOCODE)
detection_steps:
- Parse controller imports; flag any that resolve to `src/infra/persistence` or raw ORM models.
- Analyze return statements to determine if a domain entity/class is serialized directly.
- Inspect each controller for mapper usage by searching for functions named `toDomain`, `fromDomain`, or modules imported from `mappers` directories; flag missing cases.
- Ensure controllers call application services located under `src/app/services` instead of domain modules directly.
```
controllers = findFiles(['src/app/controllers','src/app/http'])
for file in controllers:
  imports = parseImports(file)
  for imp in imports:
    targetLayer = resolveLayer(imp.specifier)
    controller_imports.append({ file_path: file, line: imp.line, specifier: imp.specifier, resolved_layer: targetLayer })
    if targetLayer == 'infra':
      violations.append({ type: 'controller-imports-infra', ... })
    if targetLayer == 'domain' and !imp.specifier.includes('/ports/'):
      violations.append({ type: 'controller-imports-domain', ... })

  returns = findReturnTypes(file)
  for ret in returns:
    if ret.typeOrigin == 'domain':
      domain_returns.append({ file_path: file, line: ret.line, return_type: ret.type })

  mapper = detectMapperUsage(file)
  mapper_usage.append({ file_path: file, mapper_file: mapper, status: mapper ? 'used' : 'missing' })
  if !mapper:
    violations.append({ type: 'missing-mapper', file_path: file, line: 0, details: 'Controller must convert DTOs via mapper.' })

  if callsDomainDirectly(file):
    violations.append({ type: 'bypasses-application-service', ... })
```

REPORTING CONTRACT
REQUIRED keys: constraint_id, violation_type, file_path, line, details. Optional keys: specifier, resolved_layer, return_type, mapper_file. Provide separate entries for import, mapper, and return violations.

FIX SEQUENCE (STRICT)
1. Route controller logic through application services that encapsulate domain interactions.
2. Introduce DTO ↔ domain mapper modules and ensure controllers use them for all translations.
3. Remove direct imports of persistence models; adapters should remain behind services.
4. Update tests to assert controllers produce DTOs only and verify mapping coverage.

REVALIDATION LOOP
```
re-run validation twice or until controller_imports + domain_returns arrays show no violations.
```

SUCCESS CRITERIA (MUST)
- No controller imports infra or domain implementations directly
- domain_returns array empty
- Every controller references a mapper module
- Controllers invoke application services exclusively

FAILURE HANDLING
If a thin controller must return domain events for streaming APIs, capture the architectural exception and reference the follow-up bead; otherwise treat as failure.

COMMON MISTAKES
- Sharing ORM models between infra and controllers to save conversion steps
- Returning domain aggregates because serialization already works
- Forgetting to mock mappers in tests, leading to direct domain usage

POST-FIX ASSERTIONS
- Controller responses are DTOs documented in API specs
- Application services encapsulate domain interactions
- Mapper modules own all serialization/deserialization logic

FINAL REPORT SAMPLE
```
{
  "constraint_id": "api-boundary-hygiene",
  "violations": [
    {
      "constraint_id": "api-boundary-hygiene",
      "violation_type": "controller-imports-infra",
      "file_path": "src/app/controllers/SubscriptionController.ts",
      "line": 7,
      "details": "Imports Prisma client directly; must depend on SubscriptionService instead."
    }
  ],
  "fixes_applied": [
    "Controller now calls SubscriptionService -> SubscriptionPort mapper and returns DTOs."
  ],
  "revalidated_zero": true,
  "completion_timestamp": "2025-11-12T15:24:00Z"
}
```
