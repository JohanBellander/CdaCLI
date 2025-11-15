---
id: zod-contracts
name: Zod Contracts at Every Boundary
category: frameworks-validation
severity: error
enabled: true
optional: false
version: 1
group: frameworks
---

HEADER
constraint_id: zod-contracts
severity: error
enforcement_order: 23

PURPOSE
Ensure HTTP handlers, RPC endpoints, and form adapters validate all cross-boundary payloads with Zod schemas sourced from `packages/shared-types`.

SCOPE
include_paths: ["apps/api/src","apps/web/src","packages/shared-types"]
exclude_paths: ["node_modules","dist","build",".git"]

DEFINITIONS
shared_schema: any `z.object` exported from `packages/shared-types/src/**`
boundary_handler: files matching `apps/api/src/features/*/http.controller.ts`, `apps/web/src/app/**/*.ts`, or `apps/web/src/pages/**/*.ts`
local_schema: Zod schema defined outside `packages/shared-types`

FORBIDDEN
- boundary_handler accessing request bodies without parsing against a shared_schema
- Importing `joi`, `yup`, or other validation frameworks from boundary scopes
- Declaring local_schema for payloads that traverse between web and api layers

ALLOWED
- Local Zod schemas for purely internal UI state that never leaves `apps/web`
- Domain validation utilities that wrap shared_schema exports
- Test doubles that stub Zod parsing

REQUIRED DATA COLLECTION
boundary_files: string[]
schema_imports: Record<string,string[]>
local_schema_defs: Record<string,string[]>
violations_initial: ViolationRecord[]

VALIDATION ALGORITHM (PSEUDOCODE)
detection_steps:
- Enumerate boundary_files under scopes defined above.
- Parse import specifiers to confirm `@shared-types/` paths or relative imports from `packages/shared-types`.
- Flag files importing `joi`, `yup`, `ajv`, or raw regex validation.
- Detect inline `z.object` declarations within apps layers and confirm they reference only local concerns.
```
for file in boundary_files:
  imports = collectImports(file)
  if not imports.includes("@shared-types"):
    violations_initial.append({ violation_type: "missing_shared_schema", file_path: file })
  if imports intersects disallowed_validators:
    violations_initial.append({ violation_type: "foreign_validator", file_path: file, specifier: offending })
  if declaresLocalZodSchema(file) and schemaUsedForIO(file):
    violations_initial.append({ violation_type: "local_schema_for_contract", file_path: file })
```

REPORTING CONTRACT
Violation object REQUIRED keys: constraint_id, violation_type, file_path, line, specifier, referenced_schema. Sort by violation_type ASC then file_path ASC.

FIX SEQUENCE (STRICT)
1. Move Zod definitions for shared DTOs into `packages/shared-types`.
2. Update both `apps/api` and `apps/web` to import the shared_schema via the npm alias.
3. Delete foreign validation libraries and reimplement checks via `schema.parse`.
4. Ensure controllers and forms convert validation errors into typed responses using shared helpers.
5. Re-run validation to confirm only shared_schema usage remains.

REVALIDATION LOOP
```
violations_after = rerun_detection()
if violations_after.length > 0:
  status = "failed"
```

SUCCESS CRITERIA (MUST)
- Every boundary_handler imports at least one shared_schema.
- No alternative validation frameworks exist in boundary scopes.
- Shared schemas remain single source of truth for payloads.

FAILURE HANDLING
Mark as failed if any boundary handler still uses foreign validators or lacks shared_schema imports after retries.

COMMON MISTAKES
- Copying Zod schemas into `apps/web` for convenience instead of importing.
- Converting Zod results to `any` before returning to callers.
- Forgetting to re-export shared types via `packages/shared-types/src/index.ts`.

POST-FIX ASSERTIONS
- `packages/shared-types` exports compile without circular dependencies.
- API handlers and forms both call `schema.safeParse` on incoming data.

FINAL REPORT SAMPLE
```
{
  "constraint_id": "zod-contracts",
  "violations": [
    {
      "constraint_id": "zod-contracts",
      "violation_type": "foreign_validator",
      "file_path": "apps/web/src/features/profile/forms/EditProfileForm.tsx",
      "specifier": "yup"
    }
  ],
  "fixes_applied": [
    "Moved EditProfile schema to packages/shared-types and rewired form + controller imports"
  ],
  "revalidated_zero": true
}
```
