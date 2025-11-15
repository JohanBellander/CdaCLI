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
Prevent runaway modules by enforcing upper bounds for logical lines, exported symbols, cyclomatic complexity, and nested branches beyond what `max-file-lines` and `excessive-nesting` already cover.

SCOPE
include_paths: ["src"]
exclude_paths: ["node_modules","dist","build",".git","tests","scripts"]

DEFINITIONS
logical-lines: non-comment, non-blank lines inside a file
cyclomatic-complexity: standard complexity metric computed per function
export-count: number of named plus default exports per module
complexity-thresholds: { lines: 400, exports: 5, complexity: 12, nesting: 4 }

FORBIDDEN
- Modules exceeding any complexity-threshold without being split
- Functions with cyclomatic complexity > 12 or nesting depth > 4
- Files exporting more than five public symbols
- Mixed responsibilities (utilities + component + style definitions) residing inside the same file

ALLOWED
- Temporary threshold exceedance when the module is explicitly deprecated and the violation is documented for remediation (must be tracked in bd)
- Generated files excluded via scope filters
- Barrel files exporting numerous submodules when they contain no logic

REQUIRED DATA COLLECTION
module_metrics: {
  file_path: string;
  logical_lines: number;
  export_count: number;
  max_complexity: number;
  max_nesting: number;
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
- Compute module_metrics (logical lines, export count, max cyclomatic complexity, max nesting depth).
- Compare each metric against thresholds; record violations with specifics (function name, block range).
- Flag mixed responsibility files by detecting both JSX/TSX components and non-view logic or style strings.
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

  if metrics.logical_lines > thresholds.lines:
    violations_complexity.append({ violation_type: 'lines', observed_value: metrics.logical_lines, threshold: thresholds.lines, ... })
  if metrics.export_count > thresholds.exports:
    violations_complexity.append({ violation_type: 'exports', ... })
  for fn in ast.functions:
    if fn.cyclomatic > thresholds.complexity:
      violations_complexity.append({ violation_type: 'complexity', line_start: fn.start, line_end: fn.end, observed_value: fn.cyclomatic, threshold: thresholds.complexity })
    if fn.maxNesting > thresholds.nesting:
      violations_complexity.append({ violation_type: 'nesting', ... })

  if detectsMixedResponsibilities(ast):
    violations_complexity.append({ violation_type: 'mixed-responsibility', details: 'Component renders UI while mutating repositories', ... })
```

REPORTING CONTRACT
REQUIRED keys: constraint_id, violation_type, file_path, line_start, line_end, observed_value, threshold, details. Optional keys: function_name, export_names. For module-level thresholds line_start/line_end can represent file bounds.

FIX SEQUENCE (STRICT)
1. Split oversized modules into focused files aligned to single responsibility (e.g., extract presenters, hooks, utilities).
2. Reduce export counts by consolidating related helpers into internal functions and exposing a single orchestrator.
3. Refactor high-complexity functions using guard clauses, strategy objects, or lookup maps to flatten branching.
4. Re-run metrics to confirm all thresholds fall below their limits.

REVALIDATION LOOP
```
attempts = 0
while attempts < 2:
  rerun detection
  if violations_complexity empty: break
  attempts += 1
```

SUCCESS CRITERIA (MUST)
- No file exceeds lines, exports, complexity, or nesting thresholds
- module_metrics recorded for every analyzed file
- Mixed responsibility flag absent

FAILURE HANDLING
If a violation cannot be resolved due to external vendor SDK requirements, document the justification and create a follow-up bd issue with ownership before closing the constraint.

COMMON MISTAKES
- Declaring helper classes within a React component file instead of extracting them
- Forgetting to update barrel files after splitting modules, causing exports to balloon elsewhere
- Assuming lint tools enforce the same thresholds (they often differ)

POST-FIX ASSERTIONS
- Each module serves a singular purpose with manageable size
- Cyclomatic complexity reports show maximum <= 12
- Export lists contain only the minimal public surface needed

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
