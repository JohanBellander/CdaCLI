---
id: nextjs-app-structure
name: Next.js App Structure Guardrails
category: frameworks-nextjs
severity: error
enabled: true
optional: false
version: 1
group: frameworks
---

HEADER
constraint_id: nextjs-app-structure
severity: error
enforcement_order: 25

PURPOSE
Align `apps/web` with the documented Next.js layout so routing files stay thin, feature logic lives under `src/features`, and shared libs (`apiClient`, `queryClient`) remain the only IO entrypoints.

SCOPE
include_paths: ["apps/web/src"]
exclude_paths: ["node_modules","dist","build",".git"]

DEFINITIONS
app_router: files under `apps/web/src/app/**`
pages_router: files under `apps/web/src/pages/**`
feature_module: `apps/web/src/features/<slug>/**`
routing_leaf: `page.tsx`, `route.ts`, or `layout.tsx` inside router trees

FORBIDDEN
- Feature implementations placed directly inside routing directories beyond the routing_leaf
- Importing business/domain logic from `apps/web/src/app` or `pages` folders
- Creating ad-hoc lib folders outside `src/lib` for shared runtime clients

ALLOWED
- Thin routing_leaf files that load feature entry points
- Route handlers delegating to feature services/hooks while remaining <50 LOC
- Server components under `app/` using Next.js primitives but delegating feature logic elsewhere

REQUIRED DATA COLLECTION
routing_files: string[]
feature_imports: Record<string,string[]>
extraneous_feature_paths: string[]
violations_initial: ViolationRecord[]

VALIDATION ALGORITHM (PSEUDOCODE)
detection_steps:
- Enumerate routing_files under `app/` and `pages/`.
- Confirm each routing_leaf exports minimal logic and imports from `src/features/<slug>` or `src/lib`.
- Flag routing files that declare hooks/services locally or import from random directories.
- Detect feature directories created under routing trees instead of `src/features`.
```
routing_files = glob("apps/web/src/{app,pages}/**/*.{ts,tsx}")
for file in routing_files:
  if isRoutingLeaf(file):
    imports = collectImports(file)
    if imports.noneStartsWith("./") == false and containsFeatureLogic(file):
      violations_initial.append({ violation_type: "feature_logic_in_routes", file_path: file })
feature_dirs = glob("apps/web/src/{app,pages}/**/features/**")
if feature_dirs:
  violations_initial.append({ violation_type: "feature_folder_under_routes", file_path: dir })
```

REPORTING CONTRACT
Violation object REQUIRED keys: constraint_id, violation_type, file_path, line, details. Sort by violation_type ASC then file_path ASC.

FIX SEQUENCE (STRICT)
1. Move reusable hooks/services/components into `apps/web/src/features/<feature>` folders.
2. Convert routing_leaf files into simple delegators that import feature entry points.
3. Relocate shared clients/utilities into `apps/web/src/lib`.
4. Update module aliases to reference the new paths.
5. Re-run validation to verify route folders stay infrastructure-only.

REVALIDATION LOOP
```
violations_after = rerun_detection()
status = violations_after.length ? "failed" : "passed"
```

SUCCESS CRITERIA (MUST)
- Route trees only wire layouts/metadata while delegating logic to feature modules.
- Feature modules live exclusively under `apps/web/src/features`.
- Shared libs (`apiClient`, `queryClient`) stay under `apps/web/src/lib`.

FAILURE HANDLING
Fail the run if routing folders still own domain logic or if rogue feature directories remain after refactors.

COMMON MISTAKES
- Adding `hooks/` folders inside `app/` segments.
- Exporting database calls from Next.js server components instead of `apps/api`.
- Creating duplicate `lib/` directories per feature.

POST-FIX ASSERTIONS
- `apps/web` build succeeds with consistent module aliasing.
- Feature entry points expose UI + hooks but routing code remains minimal.

FINAL REPORT SAMPLE
```
{
  "constraint_id": "nextjs-app-structure",
  "violations": [
    {
      "constraint_id": "nextjs-app-structure",
      "violation_type": "feature_logic_in_routes",
      "file_path": "apps/web/src/app/(dashboard)/projects/page.tsx",
      "details": "Contains TanStack Query + domain orchestration inline"
    }
  ],
  "fixes_applied": [
    "Moved dashboard query + components into apps/web/src/features/projects and imported from route"
  ],
  "revalidated_zero": true
}
```
