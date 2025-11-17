---
id: shared-types-zod-source-of-truth
name: Shared Types as Zod Source of Truth
category: contracts-shared-types
severity: error
enabled: true
optional: false
version: 1
group: contracts
---

HEADER
constraint_id: shared-types-zod-source-of-truth
severity: error
enforcement_order: 29

PURPOSE
Establish a single canonical Zod definition for every cross-boundary contract so all layers share identical DTOs, enums, and validators regardless of repository shape. The principle is “pick one source of truth and make it easy for every consumer to import,” not “force a specific directory layout.”

SCOPE
include_paths: ["src","apps","packages"]
exclude_paths: ["node_modules","dist","build",".git"]

DEFINITIONS
cross_boundary_schema: Zod schema that validates payloads exchanged between processes, layers, or clients
canonical_schema_module: file that defines the authoritative cross_boundary_schema and exports both the schema and its inferred types
schema_patterns:
  - shared_package: monorepo pattern (e.g., `packages/shared-types/src/**`)
  - domain_schemas: single-package pattern (e.g., `src/domain/schemas/**`, `src/contracts/**`)
  - feature_collocated: schema lives next to the entity (e.g., `src/domain/contacts/contact.schema.ts`) but is re-exported through a contracts index
duplicate_schema: cross_boundary_schema with multiple definitions that diverge or are not re-exported from the canonical_schema_module
schema_consumer: boundary handler, controller, presenter, or UI adapter that imports DTOs/types for external messages

FORBIDDEN
- Declaring cross_boundary_schema definitions in multiple places without a documented canonical_schema_module
- Boundary handlers creating ad-hoc interfaces instead of importing inferred types from the canonical module
- Copying schemas into app/infra/UI layers because the canonical module feels “far away”
- Allowing feature_collocated schemas to skip the re-export step (downstream modules can’t discover them)
- Divergent schemas or inferred types between frontend and backend consumers

ALLOWED
- Shared package pattern when multiple apps consume contracts (monorepo default).
- Domain-schemas pattern when the repo is a single package; canonical modules can live under `src/domain/schemas/**` or `src/contracts/**`.
- Feature-collocated schemas when they are tightly coupled to a specific entity and immediately re-exported from a contracts index (`src/contracts/contacts.ts`).
- Internal-only schemas (pure UI/local state) that never cross a process boundary; they are outside this constraint’s scope.
- Temporary migrations where a canonical module exports both V1 and V2 schemas intentionally (document the window in comments/bd).

REQUIRED DATA COLLECTION
schema_registry: {
  schema_name: string;
  file_path: string;
  pattern: 'shared_package' | 'domain_schemas' | 'feature_collocated' | 'unknown';
  is_canonical: boolean;
}[]
consumer_imports: {
  file_path: string;
  schema_name: string;
  imported_from: string;
  matches_canonical: boolean;
}[]
duplicate_schemas: {
  schema_name: string;
  file_paths: string[];
}[]

VALIDATION ALGORITHM (PSEUDOCODE)
detection_steps:
- Enumerate all Zod schemas in scope and classify their pattern based on path heuristics.
- Mark one canonical_schema_module per contract when it lives in an approved pattern; everything else referencing that schema_name is a duplicate.
- Scan controllers, handlers, presenters, and UI adapters to see how they import DTOs. Flag consumers that: (a) import from non-canonical modules, (b) recreate interfaces, or (c) use literal objects without schema backing.
- Allow feature_collocated schemas only when a contracts index (`src/contracts/**`) re-exports the schema.
```
schemas = listZodSchemas(["src","apps","packages"])
for schema in schemas:
  pattern = classifyPattern(schema.file_path)
  isCanonical = pattern in ['shared_package','domain_schemas','feature_collocated'] && isPrimaryExport(schema)
  schema_registry.append({ schema_name: schema.name, file_path: schema.file_path, pattern, is_canonical: isCanonical })

groups = groupByName(schema_registry)
for group in groups:
  canonical = group.find(entry => entry.is_canonical)
  if !canonical:
    example = group[0]
    violations.push({ violation_type: "missing_canonical_module", schema: group.schema_name, file_path: example.file_path })
  else:
    nonCanonicalFiles = group.filter(entry => entry.file_path !== canonical.file_path)
    if nonCanonicalFiles.length:
      duplicate_schemas.append({ schema_name: group.schema_name, file_paths: nonCanonicalFiles.map(e => e.file_path) })

for consumer in findBoundaryConsumers():
  imports = findSchemaImports(consumer)
  if imports.empty:
    violations.push({ violation_type: "missing_schema_import", file_path: consumer })
  for imp in imports:
    matches = imp.source === canonical.file_path
    consumer_imports.append({ file_path: consumer, schema_name: imp.name, imported_from: imp.source, matches_canonical: matches })
    if !matches:
      violations.push({ violation_type: "non_canonical_import", file_path: consumer, schema: imp.name, imported_from: imp.source })

ensureFeatureCollocatedSchemasReexported(schema_registry)
```

REPORTING CONTRACT
Violation object REQUIRED keys: constraint_id, violation_type, file_path, schema, line. Order by schema ASC then file_path ASC.

FIX SEQUENCE (STRICT)
1. Decide the canonical pattern (shared package, domain schemas folder, or feature-collocated + contracts index) per contract and document it.
2. Move or re-export each cross_boundary_schema so only the canonical module defines it and exposes both the schema and its inferred types.
3. Update consumers to import from the canonical module (e.g., `@shared-types`, `src/contracts`, or `../contracts/contacts`).
4. Delete duplicate schema definitions and replace ad-hoc interfaces with `z.infer` types.
5. Re-run validation verifying all boundary code imports shared schema modules.

REVALIDATION LOOP
```
violations_after = rerun_detection()
status = violations_after.length === 0 ? "passed" : "failed"
```

SUCCESS CRITERIA (MUST)
- Every contract has a documented canonical_schema_module (pattern recorded in schema_registry).
- consumer_imports all match the canonical source path.
- duplicate_schemas array empty.

FAILURE HANDLING
Mark as failed if duplicates persist or if boundary files still omit shared imports after remediation.

COMMON MISTAKES
- Assuming every repo needs `packages/shared-types` even when a single package would suffice.
- Collocating schemas with entities but never re-exporting them, forcing consumers to guess paths.
- Copying TypeScript interfaces around instead of importing the canonical `z.infer` type.
- Forgetting to document temporary dual-schema migrations in bd, leading to lingering duplicates.

POST-FIX ASSERTIONS
- Canonical modules export both the schema and its inferred types.
- Contracts indexes (shared package or `src/contracts`) provide a single import path for each schema.
- Boundary handlers never instantiate their own validation logic.

FINAL REPORT SAMPLE
```
{
  "constraint_id": "shared-types-zod-source-of-truth",
  "violations": [
    {
      "constraint_id": "shared-types-zod-source-of-truth",
      "violation_type": "non_canonical_import",
      "file_path": "apps/api/src/features/inventory/http.dto.ts",
      "schema": "InventoryItemResponse",
      "details": "Controller imports from src/features/inventory/schema.ts instead of the canonical src/contracts/inventory.ts module."
    }
  ],
  "fixes_applied": [
    "Documented src/contracts/inventory.ts as the canonical module and updated API/UI imports to reference it."
  ],
  "revalidated_zero": true
}
```
