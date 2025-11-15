---
id: shared-types-zod-source-of-truth
name: Shared Types as Zod Source of Truth
category: contracts-shared-types
severity: error
enabled: false
optional: true
version: 1
group: contracts
---

HEADER
constraint_id: shared-types-zod-source-of-truth
severity: error
enforcement_order: 29

PURPOSE
Make `packages/shared-types` the canonical location for cross-boundary Zod schemas so both `apps/api` and `apps/web` consume identical DTOs, enums, and validators.

SCOPE
include_paths: ["packages/shared-types","apps/api/src","apps/web/src"]
exclude_paths: ["node_modules","dist","build",".git"]

DEFINITIONS
shared_types_module: files under `packages/shared-types/src/**`
contract_schema: Zod schema describing HTTP payloads, WebSocket messages, or shared value objects
duplicate_schema: contract_schema defined outside `packages/shared-types`

FORBIDDEN
- duplicate_schema living in `apps/api` or `apps/web`
- Boundary handlers referencing literal TypeScript types instead of importing from shared_types_module
- Divergent contract versions between frontend and backend packages

ALLOWED
- Local schemas for internal UI state or domain-only invariants
- Type helpers (e.g., `z.infer<typeof Schema>`) exported from shared modules
- Temporary migrations where new schema lives in shared types and old endpoints still read previous version (documented via comments)

REQUIRED DATA COLLECTION
shared_exports: string[]
frontend_imports: Record<string,string[]>
backend_imports: Record<string,string[]>
duplicate_definitions: string[]
violations_initial: ViolationRecord[]

VALIDATION ALGORITHM (PSEUDOCODE)
detection_steps:
- Enumerate Zod schemas declared in `apps/api` and `apps/web`.
- Match their names/structures against shared_types_module exports.
- Flag duplicates where same name exists outside packages/shared-types.
- Detect boundary files (controllers, route handlers, feature hooks) that access DTOs without importing shared modules.
```
shared_exports = listZodSchemas("packages/shared-types/src")
for file in glob("apps/{api,web}/src/**/*.ts*"):
  schemas = listZodSchemas(file)
  for schema in schemas:
    if schema.isBoundaryFacing():
      if schema.name not in shared_exports:
        violations_initial.append({ violation_type: "schema_outside_shared_types", file_path: file, schema: schema.name })
  if isBoundaryFile(file) and not importsSharedTypes(file):
    violations_initial.append({ violation_type: "missing_shared_import", file_path: file })
```

REPORTING CONTRACT
Violation object REQUIRED keys: constraint_id, violation_type, file_path, schema, line. Order by schema ASC then file_path ASC.

FIX SEQUENCE (STRICT)
1. Move contract_schema definitions into `packages/shared-types/src/<feature>/<schema>.ts`.
2. Export types via `packages/shared-types/src/index.ts`.
3. Update frontend and backend sites to import schemas/types using the workspace alias (`@shared-types/...`).
4. Remove duplicate local schemas and regenerate TypeScript artifacts.
5. Re-run validation verifying all boundary code imports shared schema modules.

REVALIDATION LOOP
```
violations_after = rerun_detection()
status = violations_after.length === 0 ? "passed" : "failed"
```

SUCCESS CRITERIA (MUST)
- Every boundary handler references contract_schema from shared_types_module.
- No duplicate_schema definitions remain.
- Shared package builds with zero circular imports.

FAILURE HANDLING
Mark as failed if duplicates persist or if boundary files still omit shared imports after remediation.

COMMON MISTAKES
- Copying schemas to unblock UI prototyping and forgetting to backfill shared package.
- Exporting only TypeScript types but not the Zod schema itself.
- Forgetting to bump shared-types version in consuming apps.

POST-FIX ASSERTIONS
- `packages/shared-types` tests cover the moved schemas.
- API responses documented in README reference shared schema names.

FINAL REPORT SAMPLE
```
{
  "constraint_id": "shared-types-zod-source-of-truth",
  "violations": [
    {
      "constraint_id": "shared-types-zod-source-of-truth",
      "violation_type": "schema_outside_shared_types",
      "file_path": "apps/api/src/features/inventory/http.dto.ts",
      "schema": "InventoryItemResponse"
    }
  ],
  "fixes_applied": [
    "Moved InventoryItemResponse schema into packages/shared-types/src/inventory/schema.ts and re-imported everywhere"
  ],
  "revalidated_zero": true
}
```
