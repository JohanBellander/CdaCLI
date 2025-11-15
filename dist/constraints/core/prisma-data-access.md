---
id: prisma-data-access
name: Prisma Data Access Standard
category: frameworks-data
severity: error
enabled: false
optional: true
version: 1
group: frameworks
---

HEADER
constraint_id: prisma-data-access
severity: error
enforcement_order: 24

PURPOSE
Mandate that persistence logic under `apps/api` uses Prisma clients wired through feature-specific adapters so repositories stay type-safe and composable.

SCOPE
include_paths: ["apps/api/src"]
exclude_paths: ["node_modules","dist","build",".git"]

DEFINITIONS
infra_adapter: files under `apps/api/src/features/*/infra/**`
prisma_client: import from `@prisma/client`
direct_sql: usage of `sql`, `pg`, `mysql2`, or raw SQL strings tagged with template literals

FORBIDDEN
- infra_adapter not importing prisma_client
- Use cases or domain layers importing prisma_client directly
- direct_sql usage under infra_adapter when Prisma could model the query
- Instantiating multiple PrismaClient instances per request

ALLOWED
- Domain ports that expose abstract repository interfaces
- Migration scripts under `prisma/` directories
- Read-only SQL utilities for health checks stored outside `apps/api/src/features`

REQUIRED DATA COLLECTION
infra_files: string[]
layer_mapping: Record<string,string>
import_specifiers: Record<string,string[]>
violations_initial: ViolationRecord[]

VALIDATION ALGORITHM (PSEUDOCODE)
detection_steps:
- Traverse `apps/api/src/features/**/infra/**/*`.
- Capture import_specifiers for each file.
- Flag adapters lacking `@prisma/client` imports.
- Scan domain/usecase directories for prisma_client imports and flag.
- Detect direct_sql usage via regex for `from "pg"` or ``sql`SELECT``.
```
infra_files = glob("apps/api/src/features/**/infra/**/*.ts")
for file in infra_files:
  imports = collectImports(file)
  if "@prisma/client" not in imports:
    violations_initial.append({ violation_type: "missing_prisma", file_path: file })
domain_files = glob("apps/api/src/{domain,usecases}/**/*.ts")
for file in domain_files:
  if "@prisma/client" in collectImports(file):
    violations_initial.append({ violation_type: "prisma_leaked_upstream", file_path: file })
if containsDirectSQL(file):
  violations_initial.append({ violation_type: "raw_sql_usage", file_path: file })
```

REPORTING CONTRACT
Violation object REQUIRED keys: constraint_id, violation_type, file_path, line, layer. Sort by layer ASC then file_path ASC.

FIX SEQUENCE (STRICT)
1. Centralize PrismaClient creation in `apps/api/src/infra/db/prismaClient.ts`.
2. Inject the shared client into adapters through factory functions.
3. Replace direct_sql usages with Prisma queries or raw statements executed via `prisma.$queryRaw` plus typed return value.
4. Remove Prisma imports from domain/usecase files and replace with ports.
5. Re-run validation to ensure all infra adapters depend on the shared Prisma client.

REVALIDATION LOOP
```
violations_after = rerun_detection()
status = violations_after.length === 0 ? "passed" : "failed"
```

SUCCESS CRITERIA (MUST)
- Only infra adapters import `@prisma/client`.
- No raw SQL libraries exist under `apps/api/src`.
- PrismaClient instantiated once and shared via adapters.

FAILURE HANDLING
Mark run as failed if domain layers keep referencing Prisma or raw SQL persists after remediation.

COMMON MISTAKES
- Creating PrismaClient per HTTP request leading to connection spikes.
- Returning Prisma models directly to controllers instead of mapping to DTOs.
- Forgetting to include `await prisma.$disconnect()` in shutdown hooks.

POST-FIX ASSERTIONS
- Unit tests mock repository ports rather than Prisma directly.
- `npm run prisma:generate` completes without schema drift.

FINAL REPORT SAMPLE
```
{
  "constraint_id": "prisma-data-access",
  "violations": [
    {
      "constraint_id": "prisma-data-access",
      "violation_type": "prisma_leaked_upstream",
      "file_path": "apps/api/src/domain/orders/OrderAggregate.ts"
    }
  ],
  "fixes_applied": [
    "Removed Prisma import from OrderAggregate and injected via OrdersRepository port"
  ],
  "revalidated_zero": true
}
```
