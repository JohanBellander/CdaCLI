---
id: module-complexity-guardrails
name: Module Complexity Guardrails
category: quality
severity: error
enabled: true
optional: true
version: 1
group: best-practices
---

HEADER
constraint_id: module-complexity-guardrails
severity: error
enforcement_order: 17

PURPOSE
Keep modules readable by balancing size with cohesion. The principle is “one file owns one idea.” Use heuristics to decide when a module is doing too much instead of blindly splitting at arbitrary limits.

SCOPE
include_paths: ["src"]
exclude_paths: ["node_modules","dist","build",".git","tests","scripts"]

DEFINITIONS
logical_lines: non-comment, non-blank lines inside a file
cyclomatic_complexity: standard complexity metric computed per function
export_count: number of named plus default exports per module
guiding_thresholds: { lines_soft: 400, lines_hard: 550, exports_soft: 7, exports_red_flag: 12, complexity: 12, nesting: 4 }
responsibility_cluster: group of exports whose names share a slug/prefix (e.g., Contact*, ContactSchema, createContactInput)
god_module_signal: file exhibiting multiple unrelated clusters (billing + reporting), long mixed responsibilities (UI + persistence), or exceeding red-flag thresholds

FORBIDDEN
- Ignoring god-module signals (15+ unrelated exports, mixing UI + domain + infra responsibilities).
- Files that exceed `lines_hard` or `exports_red_flag` without a documented reason in bd.
- Functions whose complexity/nesting blows past thresholds because the file tries to coordinate entire workflows.
- Combining unrelated responsibilities (entity + HTTP controller + React component) to “keep things together.”

ALLOWED
- Cohesive modules that pair an entity with closely-related helpers (entity + schema + 2–3 DTOs).
- Shared utility files exporting a handful of variations for the same concept (e.g., amountFormat, amountParser, amountValidator).
- Temporary soft-threshold exceedance when the team documents intent (bd reference) and the exports clearly belong to one cluster.
- Barrel files that simply re-export symbols without additional logic.
- Generated files excluded via scope filters.

REQUIRED DATA COLLECTION
module_metrics: {
  file_path: string;
  logical_lines: number;
  export_count: number;
  max_complexity: number;
  max_nesting: number;
}[]
cohesion_notes: {
  file_path: string;
  clusters: { slug: string; export_names: string[] }[];
  god_module_signal: boolean;
  rationale?: string;
}[]
violations_complexity: {
  file_path: string;
  line_start: number;
  line_end: number;
  violation_type: 'lines' | 'exports' | 'complexity' | 'nesting';
  observed_value: number;
  threshold: number;
  details: string;
}[]

VALIDATION ALGORITHM (PSEUDOCODE)
detection_steps:
- Iterate over all source modules within scope, skipping tests and generated directories.
- Compute module_metrics and derive responsibility-clusters by grouping exports with similar slugs.
- Flag god-module signals when:
  - export_count > guiding_thresholds.exports_red_flag,
  - logical_lines > guiding_thresholds.lines_hard,
  - clusters span unrelated prefixes (contacts*, billing*, invoices*),
  - files mix UI, domain, and infra artifacts simultaneously.
- Treat exports_soft and lines_soft as “review” triggers: if thresholds are exceeded but clusters remain cohesive (single slug), annotate rather than fail.
- Inspect functions whose cyclomatic complexity or nesting crosses limits; record violations with context (e.g., orchestrator bundling 6 concerns).
```
files = findFiles('src', { ignore: ['tests','__tests__','*.d.ts'] })
for file in files:
  ast = analyzeFile(file)
  metrics = {
    logical_lines: countLogicalLines(ast),
    export_count: countExports(ast),
    max_complexity: maxCyclomatic(ast),
    max_nesting: maxNesting(ast)
  }
  module_metrics.append({ file_path: file, ...metrics })

  clusters = buildClusters(ast.exports)
  godModule = isGodModule(clusters, metrics, ast)
  cohesion_notes.append({ file_path: file, clusters, god_module_signal: godModule })

  if metrics.logical_lines > thresholds.lines_hard:
    violations_complexity.append({ violation_type: 'lines', observed_value: metrics.logical_lines, threshold: thresholds.lines_hard, ... })
  else if metrics.logical_lines > thresholds.lines_soft && godModule:
    violations_complexity.append({ violation_type: 'lines_god_module', observed_value: metrics.logical_lines, threshold: thresholds.lines_soft, details: 'Large file mixes unrelated clusters' })
  if metrics.export_count > thresholds.exports_red_flag:
    violations_complexity.append({ violation_type: 'exports', observed_value: metrics.export_count, threshold: thresholds.exports_red_flag, ... })
  else if metrics.export_count > thresholds.exports_soft && godModule:
    violations_complexity.append({ violation_type: 'exports_god_module', ... })
  for fn in ast.functions:
    if fn.cyclomatic > thresholds.complexity:
      violations_complexity.append({ violation_type: 'complexity', line_start: fn.start, line_end: fn.end, observed_value: fn.cyclomatic, threshold: thresholds.complexity })
    if fn.maxNesting > thresholds.nesting:
      violations_complexity.append({ violation_type: 'nesting', ... })

  if godModule:
    violations_complexity.append({ violation_type: 'mixed-responsibility', details: describeClusters(clusters), ... })
```

REPORTING CONTRACT
REQUIRED keys: constraint_id, violation_type, file_path, line_start, line_end, observed_value, threshold, details. Optional keys: function_name, export_names. For module-level thresholds line_start/line_end can represent file bounds.

FIX SEQUENCE (STRICT)
1. Decide whether the exports belong together; if not, carve out files aligned with each cluster (e.g., contacts entity vs contacts HTTP DTOs).
2. Convert supporting exports into internal helpers when they only serve a wrapper function.
3. Refactor high-complexity functions by extracting strategies or splitting orchestration and pure transforms.
4. Re-run metrics and annotate bd tickets for intentional soft-threshold exceedances that remain cohesive.

REVALIDATION LOOP
```
attempts = 0
while attempts < 2:
  rerun detection
  if violations_complexity empty: break
  attempts += 1
```

SUCCESS CRITERIA (MUST)
- No file triggers hard thresholds without remediation.
- Cohesion notes show each module has a single clear responsibility cluster.
- Mixed-responsibility violations only remain when documented as intentional exceptions.

FAILURE HANDLING
If a violation cannot be resolved due to external vendor SDK requirements, document the justification and create a follow-up bd issue with ownership before closing the constraint.

COMMON MISTAKES
- Splitting cohesive modules just to satisfy a numeric export limit (entity + schema + DTO belongs together).
- Keeping orchestration, persistence, and presentation logic in one giant service because it “feels faster.”
- Forgetting to update barrel files after extracting clusters, which makes other modules import the old god file.
- Assuming lint tools enforce the same heuristics; they usually stop at simple length checks.

POST-FIX ASSERTIONS
- Each module owns a singular responsibility and any supporting exports tie back to that slug.
- Cyclomatic complexity reports show maximum <= 12.
- Export lists stay within the soft range (<=7) unless intentionally documented.

FINAL REPORT SAMPLE
```
{
  "constraint_id": "module-complexity-guardrails",
  "violations": [
    {
      "constraint_id": "module-complexity-guardrails",
      "violation_type": "complexity",
      "file_path": "src/app/services/CheckoutService.ts",
      "line_start": 40,
      "line_end": 140,
      "observed_value": 18,
      "threshold": 12,
      "details": "processCheckout contains nested branching across five payment types."
    }
  ],
  "fixes_applied": [
    "Extracted payment strategies per provider and reduced processCheckout complexity to 6."
  ],
  "revalidated_zero": true,
  "completion_timestamp": "2025-11-12T15:20:00Z"
}
```
