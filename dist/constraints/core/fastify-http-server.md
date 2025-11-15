---
id: fastify-http-server
name: Fastify HTTP Server Enforcement
category: frameworks-fastify
severity: error
enabled: false
optional: true
version: 1
group: frameworks
---

HEADER
constraint_id: fastify-http-server
severity: error
enforcement_order: 22

PURPOSE
Guarantee that `apps/api` exposes HTTP endpoints exclusively through Fastify so routing, hooks, and plugins stay centralized in the documented server bootstrap.

SCOPE
include_paths: ["apps/api/src"]
exclude_paths: ["node_modules","dist","build",".git"]

DEFINITIONS
fastify_bootstrap: `apps/api/src/server.ts` or `apps/api/src/app.ts` entry that instantiates `FastifyInstance`
controller_file: any file matching `apps/api/src/features/*/http.controller.ts`
fastify_import: `import {...} from "fastify"`
disallowed_http_framework: imports from ["express","koa","hapi","restify"]

FORBIDDEN
- controller_file without at least one fastify_import
- controller_file importing disallowed_http_framework modules
- instantiating HTTP servers with `http.createServer` or `express()` under `apps/api/src`
- registering routes outside the fastify_bootstrap entry

ALLOWED
- Domain/usecase/infra files that never touch HTTP transports
- Tests that mock Fastify types via `@fastify/*` packages
- Scripts under `scripts/` that spin up ad-hoc servers for benchmarking

REQUIRED DATA COLLECTION
controller_files: string[]
controller_imports: Record<string, string[]>
bootstrap_files: string[]
violations_initial: ViolationRecord[]

VALIDATION ALGORITHM (PSEUDOCODE)
detection_steps:
- Enumerate controller_files under `apps/api/src/features/**/http.controller.ts`.
- Parse import specifiers for each controller_file.
- Mark violations when fastify_import missing or disallowed_http_framework present.
- Ensure bootstrap_files only instantiate Fastify and register plugins/routes via Fastify APIs.
```
controller_files = glob("apps/api/src/features/**/http.controller.ts")
for file in controller_files:
  imports = collectImports(file)
  if "fastify" not in imports:
    violations_initial.append({ constraint_id: id, violation_type: "missing_fastify_import", file_path: file })
  if imports intersects disallowed_http_frameworks:
    violations_initial.append({ constraint_id: id, violation_type: "foreign_http_framework", file_path: file, specifier: offending })
bootstrap_files = glob("apps/api/src/{server,app}.ts")
assertFastifyUsage(bootstrap_files)
```

REPORTING CONTRACT
Violation object REQUIRED keys: constraint_id, violation_type, file_path, line, specifier. Sort by file_path ASC then violation_type ASC.

FIX SEQUENCE (STRICT)
1. Replace foreign HTTP imports with Fastify primitives (`FastifyInstance`, `FastifyRequest`, `FastifyReply`).
2. Ensure controllers register handlers via `fastify.route` or plugin registration exported from the controller file.
3. Move bootstrap logic into a single fastify_bootstrap entry and wire controllers via Fastify plugins.
4. Delete express/koa adapters and update dependency manifests.
5. Re-run validation to confirm only Fastify constructs remain.

REVALIDATION LOOP
```
violations_after = rerun_detection()
status = "passed" if violations_after.length === 0 else "failed"
```

SUCCESS CRITERIA (MUST)
- All controller_files import from `fastify`.
- No disallowed_http_framework imports remain.
- Exactly one bootstrap registers every HTTP route through Fastify APIs.

FAILURE HANDLING
Escalate as `failed` if any controller continues to bypass Fastify or introduces another server framework after two fix attempts.

COMMON MISTAKES
- Leaving `express.Request` type aliases in shared DTOs.
- Registering routes via plain `app.get` instead of Fastify plugins.
- Forgetting to wrap server start with `await fastify.listen`.

POST-FIX ASSERTIONS
- `npm run dev` for `apps/api` shows Fastify banner.
- Controllers expose only Fastify handler signatures.

FINAL REPORT SAMPLE
```
{
  "constraint_id": "fastify-http-server",
  "violations": [
    {
      "constraint_id": "fastify-http-server",
      "violation_type": "foreign_http_framework",
      "file_path": "apps/api/src/features/users/http.controller.ts",
      "specifier": "express"
    }
  ],
  "fixes_applied": [
    "Refactored users controller to import FastifyReply/FastifyRequest and register via fastify.route"
  ],
  "revalidated_zero": true
}
```
