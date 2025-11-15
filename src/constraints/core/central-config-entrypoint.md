---
id: central-config-entrypoint
name: Centralized Configuration Entry Point
category: configuration
severity: error
enabled: true
optional: true
version: 1
group: architecture
---

HEADER
constraint_id: central-config-entrypoint
severity: error
enforcement_order: 15

PURPOSE
Route all runtime configuration (environment variables, secrets, flags) through `src/infra/config/index.ts` so no module reads `process.env` or secret stores directly.

SCOPE
include_paths: ["src"]
exclude_paths: ["node_modules","dist","build",".git","tests"]
canonical_entrypoint: "src/infra/config/index.ts"

DEFINITIONS
config-entrypoint: canonical module exporting typed getters from `canonical_entrypoint`
direct-env-read: any usage of `process.env`, `dotenv`, cloud secret SDKs, or local config files outside the entrypoint
approved-callsite: modules importing the config-entrypoint and consuming exported getters

FORBIDDEN
- Accessing `process.env` or configuring dotenv anywhere other than the entrypoint
- Creating alternative config modules that wrap env values without delegating to the canonical entrypoint
- Mutating configuration at runtime (e.g., toggling process.env or writing JSON config files)
- Exporting bare env variables from feature modules

ALLOWED
- Importing the entrypoint and consuming strongly typed getters
- Using dependency injection to provide config values to domain/app layers
- Caching config results inside the entrypoint with explicit initialization guards
- Creating secondary modules that re-export entrypoint getters without re-reading env vars

REQUIRED DATA COLLECTION
env_reads: {
  file_path: string;
  line: number;
  expression: string;
  reason: 'process-env' | 'dotenv' | 'secret-sdk';
}[]
entrypoint_exports: {
  export_name: string;
  type: string;
}
alternate_config_modules: string[]

VALIDATION ALGORITHM (PSEUDOCODE)
detection_steps:
- Scan entire src tree for `process.env`, `dotenv.config`, or known secret SDK calls outside the canonical entrypoint and record env_reads entries.
- Parse the entrypoint file to ensure it exports typed getters; warn if it re-exports raw env vars without validation.
- Identify modules that declare configuration constants (filenames matching `*config*.ts`) and confirm they import from the entrypoint; otherwise record them as alternate_config_modules.
- Summarize violations with actionable context.
```
files = findFiles('src')
for file in files:
  if file == canonical_entrypoint: continue
  if containsProcessEnv(file) or usesSecretSdk(file):
    env_reads.append({ file_path: file, line: match.line, expression: match.text, reason: match.reason })

entryExports = parseExports(canonical_entrypoint)
entrypoint_exports = entryExports
if entryExports.empty:
  violations.append({ type: 'missing-exports', file_path: canonical_entrypoint, line: 0, details: 'Entry point must expose getters.' })

configLike = files.filter(f => f.matches(/config/i))
for file in configLike:
  if !imports(file, canonical_entrypoint):
    alternate_config_modules.add(file)
```

REPORTING CONTRACT
REQUIRED keys: constraint_id, violation_type, file_path, line, details. Optional keys: expression, reason. Alternate modules must list file_path and describe the missing dependency on the entrypoint.

FIX SEQUENCE (STRICT)
1. Move all env reads into `src/infra/config/index.ts`, wrapping them with validation and sane defaults.
2. Export typed getter functions or factories from the entrypoint and update consumers to import them.
3. Delete or refactor alternate config modules so they re-export or consume the canonical helpers only.
4. Add regression tests ensuring configuration lookups occur through the centralized API.

REVALIDATION LOOP
```
revalidate twice or until env_reads and alternate_config_modules arrays are empty.
```

SUCCESS CRITERIA (MUST)
- env_reads array empty for all files except the entrypoint
- No alternate config modules remain outside the canonical path
- Entry point exports at least one getter/function with validation

FAILURE HANDLING
If certain frameworks demand local `.env` parsing (e.g., Next.js), document the exception and ensure the adapter feeds values back through the entrypoint before shipping.

COMMON MISTAKES
- Leaving `process.env` references inside tests that later leak into production builds
- Creating per-feature config files that never flow through the shared validator
- Forgetting to handle undefined env variables and relying on runtime errors

POST-FIX ASSERTIONS
- Only the canonical entrypoint reads external configuration sources
- All other modules import typed helpers or receive config via DI
- Entry point validates and documents every configuration key

FINAL REPORT SAMPLE
```
{
  "constraint_id": "central-config-entrypoint",
  "violations": [
    {
      "constraint_id": "central-config-entrypoint",
      "violation_type": "process-env-outside-entrypoint",
      "file_path": "src/app/services/EmailService.ts",
      "line": 18,
      "details": "Service reads process.env.SMTP_URL directly."
    }
  ],
  "fixes_applied": [
    "Moved SMTP_URL access into src/infra/config/index.ts and injected via EmailService constructor."
  ],
  "revalidated_zero": true,
  "completion_timestamp": "2025-11-12T15:16:00Z"
}
```
