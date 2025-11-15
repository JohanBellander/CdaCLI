---
id: observability-discipline
name: Observability Discipline
category: operations
severity: error
enabled: true
optional: true
version: 1
group: best-practices
---

HEADER
constraint_id: observability-discipline
severity: error
enforcement_order: 20

PURPOSE
Guarantee all logs and metrics route through shared telemetry adapters (e.g., `src/infra/telemetry/logger.ts`, `src/infra/telemetry/metrics.ts`) so context, correlation IDs, and formatting remain consistent.

SCOPE
include_paths: ["src"]
approved_adapters: ["src/infra/telemetry/logger.ts","src/infra/telemetry/metrics.ts"]
exclude_paths: ["node_modules","dist","build",".git","tests"]

DEFINITIONS
telemetry-adapter: approved module exporting logger/metrics clients with enforced context
direct-log-call: invocation of console.log/warn/error or third-party logger constructors
missing-context: log invocation lacking correlationId/user/session metadata

FORBIDDEN
- Calling console.* or instantiating loggers/metrics clients directly inside feature code
- Emitting telemetry without required context fields (correlationId minimum)
- Creating ad-hoc wrappers that bypass approved adapters
- Muting errors by logging and swallowing exceptions instead of rethrowing/propagating

ALLOWED
- Importing telemetry adapters and using the provided logger/metrics functions
- Passing contextual metadata from higher layers into adapters
- Creating lightweight helper functions that wrap adapters while preserving context contract

REQUIRED DATA COLLECTION
telemetry_calls: {
  file_path: string;
  line: number;
  expression: string;
  adapter_used: string | null;
  has_context: boolean;
}[]
direct_logger_instantiations: {
  file_path: string;
  line: number;
  package: string;
}[]
suppressed_errors: {
  file_path: string;
  line: number;
  details: string;
}[]

VALIDATION ALGORITHM (PSEUDOCODE)
detection_steps:
- Scan for `console.*`, `logger = new`, `metricsClient = new`, or imports from known telemetry SDKs; classify whether approved adapters are used.
- Inspect argument lists to ensure a `context` object containing `correlationId` (and optionally user/session) is passed.
- Detect catch blocks that log errors but do not rethrow or return failure signals.
- Record violations for each offense with actionable details.
```
files = findFiles('src')
for file in files:
  ast = parseAst(file)
  calls = findTelemetryCalls(ast)
  for call in calls:
    usesAdapter = call.importSource in approved_adapters
    hasContext = call.arguments includes key 'correlationId'
    telemetry_calls.append({
      file_path: file,
      line: call.line,
      expression: call.text,
      adapter_used: usesAdapter ? call.importSource : null,
      has_context: hasContext
    })
    if !usesAdapter:
      violations.append({ type: 'direct-log-call', ... })
    else if !hasContext:
      violations.append({ type: 'missing-context', ... })

  loggerNews = findNewLoggerExpressions(ast)
  direct_logger_instantiations.extend(loggerNews)

  suppressed = findCatchBlocks(ast, c => c.logsError && !c.rethrows)
  suppressed_errors.extend(suppressed)
```

REPORTING CONTRACT
REQUIRED keys: constraint_id, violation_type, file_path, line, details. Optional keys: expression, adapter_used, has_context. Provide separate entries for direct log calls, missing context, and suppressed errors.

FIX SEQUENCE (STRICT)
1. Replace console/third-party logger usage with the approved telemetry adapters and ensure they are injected where necessary.
2. Thread correlationId/user/session context from request boundaries down to every log/metric emission.
3. Update catch blocks to rethrow after logging or translate into error results, avoiding silent failures.
4. Add automated tests verifying the adapters receive structured context.

REVALIDATION LOOP
```
re-run detection twice or until telemetry_calls only reference approved adapters and include context.
```

SUCCESS CRITERIA (MUST)
- All telemetry_calls originate from approved adapters
- has_context flag true for every recorded call
- direct_logger_instantiations and suppressed_errors arrays empty

FAILURE HANDLING
If legacy code cannot inject correlation IDs, capture the backlog work in bd and block release until the omission is resolved or risk accepted by architecture leadership.

COMMON MISTAKES
- Using console.log for quick debugging and leaving it in commits
- Creating new logger instances per module instead of reusing adapters
- Logging errors but returning success to avoid breaking callers

POST-FIX ASSERTIONS
- Telemetry adapters are the only path to emit logs/metrics
- Context propagation verified via automated tests
- Error handling surfaces failures after logging

FINAL REPORT SAMPLE
```
{
  "constraint_id": "observability-discipline",
  "violations": [
    {
      "constraint_id": "observability-discipline",
      "violation_type": "direct-log-call",
      "file_path": "src/app/services/UserService.ts",
      "line": 58,
      "details": "console.error used instead of logger from src/infra/telemetry/logger.ts."
    }
  ],
  "fixes_applied": [
    "Injected telemetry logger into UserService and ensured correlationId is forwarded."
  ],
  "revalidated_zero": true,
  "completion_timestamp": "2025-11-12T15:26:00Z"
}
```
