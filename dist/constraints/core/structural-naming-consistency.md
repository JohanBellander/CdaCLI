---
id: structural-naming-consistency
name: Structural Naming Consistency
category: conventions
severity: error
enabled: true
optional: true
version: 1
group: best-practices
---

HEADER
constraint_id: structural-naming-consistency
severity: error
enforcement_order: 16

PURPOSE
Keep feature folders and entry files aligned across layers so contributors can navigate by instinct. The principle: pick a naming style (short vs long, hyphenated slug) and consistently reuse it. Consistency reduces cognitive load and prevents duplicate folders such as `infra/` plus `infrastructure/`.

SCOPE
include_paths: ["src/ui","src/app","src/domain","src/infra"]
exclude_paths: ["node_modules","dist","build",".git","tests"]

DEFINITIONS
feature-slug: kebab-case token derived from folder name (e.g., 'billing-cycle')
feature-root(layer): highest-level folder directly under the layer directory (`src/ui/<slug>`, `src/app/<slug>`, etc.)
entry-file: default module exported by the feature root, which can be:
  - index.ts (traditional barrel export), OR
  - <slug>.ts (explicit feature entry, e.g., contacts.ts in src/domain/contacts/)
  - Both patterns are acceptable; choose one consistently within a feature
canonical-slug-map: combined list of feature-slugs detected across all layers
layer-alias-options:
  - ui: ["ui","presentation"]
  - app: ["app","application"]
  - infra: ["infra","infrastructure"]
  - domain: ["domain","core"]
layer-alias-choice: the specific alias detected in the repo for a canonical layer. Multiple aliases for the same layer indicate inconsistency.

FORBIDDEN
- Feature roots with camelCase, PascalCase, or snake_case names (slug should remain kebab-case).
- Mismatched slugs across layers (e.g., `billing` in app but `billing-cycle` in domain).
- Entry files whose basename does not match the feature slug (except index.ts which is always allowed).
- Duplicate feature directories that only differ by pluralization, casing, or alias (`infra` vs `infrastructure`).
- Using multiple layer aliases simultaneously (e.g., `src/app` and `src/application` both exist).
- Missing entry file entirely (must have either index.ts or <slug>.ts).

ALLOWED
- Additional nested folders within a feature as long as the root slug and entry file follow the convention
- Feature slugs existing in only one layer when the module is intentionally isolated
- Using index.ts as the entry file for any feature (universal barrel pattern)
- Using <slug>.ts as the entry file (e.g., contacts.ts in src/domain/contacts/)
- Appending technology qualifiers after the slug for non-entry files (e.g., `billing-cycle.adapter.ts`) while still starting with the slug
- Picking either `infra` or `infrastructure` (same for `app`/`application`, `ui`/`presentation`) so long as the choice is consistent across the repo.
- Intentionally mapping layers to alternate names (e.g., `src/core` instead of `src/domain`) when documented and applied uniformly.

REQUIRED DATA COLLECTION
feature_roots: {
  layer: 'ui' | 'app' | 'domain' | 'infra';
  slug: string;
  folder_path: string;
  entry_file: string | null;
  violations: string[];
}[]
slug_collisions: {
  canonical: string;
  variants: string[];
}[]
layer_aliases: {
  layer: 'ui' | 'app' | 'domain' | 'infra';
  detected_aliases: string[];
  inconsistent: boolean;
}[]

VALIDATION ALGORITHM (PSEUDOCODE)
detection_steps:
- Enumerate immediate subdirectories of each layer and derive slugs; validate they are kebab-case.
- For each feature root, ensure an entry-file exists whose basename starts with the slug.
- Build the canonical-slug-map by grouping equivalent slugs; flag collisions where layers disagree on naming.
- Detect duplicates where only pluralization or casing differs (billing vs Billing vs billings).
- Track which alias each canonical layer uses (`src/infra` vs `src/infrastructure`). Flag when multiple aliases for the same layer exist simultaneously.
```
layers = ['src/ui','src/app','src/domain','src/infra']
for layerPath in layers:
  dirs = listImmediateDirectories(layerPath)
  for dir in dirs:
    slug = deriveSlug(dir.name)
    violations = []
    if dir.name != slug:
      violations.append('non-kebab-case')
    # Check for either index.ts or <slug>.ts as valid entry files
    entry = findFile(dir, 'index.ts') or findFile(dir, slug + '.ts')
    if !entry:
      violations.append('missing-entry-file')
    feature_roots.append({
      layer: layerName(layerPath),
      slug,
      folder_path: dir.path,
      entry_file: entry,
      violations
    })

groups = groupBySlug(feature_roots)
for group in groups:
  variants = uniqueOriginalNames(group)
  if variants.length > 1:
    slug_collisions.append({ canonical: group.slug, variants })

alias_report = layers.map(layer => {
  aliases = detectAliases(layer)
  return { layer: layerName(layer), detected_aliases: aliases, inconsistent: aliases.length > 1 }
})
```

REPORTING CONTRACT
REQUIRED keys: constraint_id, violation_type, layer, folder_path, details. Optional keys: slug, entry_file, variants. Each slug collision must describe all conflicting folder names.

FIX SEQUENCE (STRICT)
1. Decide on the canonical alias per layer (e.g., `infra` vs `infrastructure`) and update outliers to match.
2. Rename offending feature folders to kebab-case slugs and update import paths across the repo.
3. Align entry file basenames with the slug (e.g., `billing-cycle.service.ts`) and ensure index barrels re-export them.
4. Consolidate duplicate feature directories by picking a canonical slug and moving code accordingly.
5. Update documentation and routing tables to reference the canonical slug.

REVALIDATION LOOP
```
rerun validation until feature_roots.violations and slug_collisions arrays are empty (max 2 passes)
```

SUCCESS CRITERIA (MUST)
- All feature root folders are kebab-case.
- Each feature root exposes an entry file that begins with the slug.
- slug_collisions array empty.
- layer_aliases show exactly one alias per canonical layer (no simultaneous `infra`/`infrastructure`).

FAILURE HANDLING
If framework-imposed names (e.g., Next.js `pages`) conflict with this rule, document the exception and ensure only that directory is excluded from enforcement via README annotation.

COMMON MISTAKES
- Leaving legacy CamelCase feature folders after migrations
- Forgetting to rename index files, causing mismatched imports
- Creating overlapping singular/plural folder names to experiment with reorganizations
- Mixing short/long layer names (“application” folder and “app” folder) which confuses agents exploring the tree

POST-FIX ASSERTIONS
- Feature folder names match across layers and follow kebab-case
- Entry files expose the same slugged prefix and appear in import statements
- No duplicate routing or module paths remain

FINAL REPORT SAMPLE
```
{
  "constraint_id": "structural-naming-consistency",
  "violations": [
    {
      "constraint_id": "structural-naming-consistency",
      "violation_type": "layer-alias-mismatch",
      "layer": "infra",
      "folder_path": "src/infrastructure",
      "details": "Detected both 'infra' and 'infrastructure' layer aliases. Consolidate on one."
    }
  ],
  "fixes_applied": [
    "Standardized on 'infra' alias, renamed src/infrastructure → src/infra, and aligned feature entry files."
  ],
  "revalidated_zero": true,
  "completion_timestamp": "2025-11-12T15:18:00Z"
}
```
