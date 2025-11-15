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
Keep feature folders and entry files aligned across layers so a feature has the same slug in `ui`, `app`, `domain`, and `infra`, preventing drift caused by ad-hoc pluralization or casing.

SCOPE
include_paths: ["src/ui","src/app","src/domain","src/infra"]
exclude_paths: ["node_modules","dist","build",".git","tests"]

DEFINITIONS
feature-slug: kebab-case token derived from folder name (e.g., 'billing-cycle')
feature-root(layer): highest-level folder directly under the layer directory (`src/ui/<slug>`, `src/app/<slug>`, etc.)
entry-file: default module exported by the feature root (index.ts, <slug>.service.ts, <slug>.adapter.ts)
canonical-slug-map: combined list of feature-slugs detected across all layers

FORBIDDEN
- Feature roots with camelCase, PascalCase, or snake_case names
- Mismatched slugs across layers (e.g., `billing` in app but `billing-cycle` in domain)
- Entry files whose basename does not match the feature slug
- Duplicate feature directories differing only by suffix (`billing` vs `billings`)

ALLOWED
- Additional nested folders within a feature as long as the root slug and entry file follow the convention
- Feature slugs existing in only one layer when the module is intentionally isolated
- Appending technology qualifiers after the slug (e.g., `billing-cycle.adapter.ts`) while still starting with the slug

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

VALIDATION ALGORITHM (PSEUDOCODE)
detection_steps:
- Enumerate immediate subdirectories of each layer and derive slugs; validate they are kebab-case.
- For each feature root, ensure an entry-file exists whose basename starts with the slug.
- Build the canonical-slug-map by grouping equivalent slugs; flag collisions where layers disagree on naming.
- Detect duplicates where only pluralization or casing differs (billing vs Billing vs billings).
```
layers = ['src/ui','src/app','src/domain','src/infra']
for layerPath in layers:
  dirs = listImmediateDirectories(layerPath)
  for dir in dirs:
    slug = deriveSlug(dir.name)
    violations = []
    if dir.name != slug:
      violations.append('non-kebab-case')
    entry = findEntryFile(dir, slug)
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
```

REPORTING CONTRACT
REQUIRED keys: constraint_id, violation_type, layer, folder_path, details. Optional keys: slug, entry_file, variants. Each slug collision must describe all conflicting folder names.

FIX SEQUENCE (STRICT)
1. Rename offending folders to kebab-case slugs and update import paths across the repo.
2. Align entry file basenames with the slug (e.g., `billing-cycle.service.ts`) and ensure index barrels re-export them.
3. Consolidate duplicate feature directories by picking a canonical slug and moving code accordingly.
4. Update documentation and routing tables to reference the canonical slug.

REVALIDATION LOOP
```
rerun validation until feature_roots.violations and slug_collisions arrays are empty (max 2 passes)
```

SUCCESS CRITERIA (MUST)
- All feature root folders are kebab-case
- Each feature root exposes an entry file that begins with the slug
- slug_collisions array empty

FAILURE HANDLING
If framework-imposed names (e.g., Next.js `pages`) conflict with this rule, document the exception and ensure only that directory is excluded from enforcement via README annotation.

COMMON MISTAKES
- Leaving legacy CamelCase feature folders after migrations
- Forgetting to rename index files, causing mismatched imports
- Creating overlapping singular/plural folder names to experiment with reorganizations

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
      "violation_type": "slug-collision",
      "layer": "domain",
      "folder_path": "src/domain/Billing",
      "details": "Found variants ['Billing','billing-cycle']; rename to a single slug."
    }
  ],
  "fixes_applied": [
    "Standardized on 'billing-cycle' slug for ui/app/domain layers and renamed entry files."
  ],
  "revalidated_zero": true,
  "completion_timestamp": "2025-11-12T15:18:00Z"
}
```
