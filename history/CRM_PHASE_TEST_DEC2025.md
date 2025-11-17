# CRM Phase Test (December 2025)

## Setup
- **Test target**: Validate the rewritten `shared-types-zod-source-of-truth`, `module-complexity-guardrails`, and `structural-naming-consistency` constraints during Phase 2 of a single-package CRM implementation.
- **Workspace**: `tmp/crm-phase-test` (fresh directory outside the CDA CLI source tree).
- **Agent**: GitHub Copilot CLI (`copilot --model gpt-5 --allow-all-tools --allow-all-paths`).
  - Prompt 1 scaffolded the contracts/domain/application files (see CLI transcript on 2025-11-17 10:46 UTC).
  - Prompt 2 refactored `contact.entity.ts` to remove side effects (dependency-injected id/timestamps).
- **Repository shape**: Single package with `src/contracts`, `src/domain`, and `src/app`. No `packages/shared-types` folder was created to confirm the new contextual guidance accepts domain/local schema hubs.

## Execution Notes
| Iteration | Action | Violations (targeted constraints) |
|-----------|--------|-----------------------------------|
| 1 | Generated CRM scaffolding via Copilot. Detected two issues: domain entity used `crypto.randomUUID/new Date` (side effects) and `registerContact.ts` imported the entity without supplying deterministic deps. | 2 |
| 2 | Asked Copilot to refactor the entity for injected deps and manually updated the use case to pass `generateId/now`. Re-ran manual review of the three constraints; no further violations observed. | 0 |

- Phase 2 cleared after **2 validation runs (<3 target)** with **0 outstanding violations (<5 target)**.
- The AI never attempted to scaffold a monorepo or create `packages/shared-types`; it kept schemas under `src/contracts`, demonstrating the principle-based language preserved a single canonical module without forcing new packages.
- `ContactSchema` + `NewContactSchema` share the same file, resulting in four exports. Previous prescriptive language would have demanded file splitting; the updated guardrail treated it as a cohesive cluster because all exports share the `Contact` slug.
- Structural naming stayed consistent: only `src/app/**` exists (no duplicate `application/` folders), so the new alias detection confirmed the layer naming was intentional and uncluttered.

## Comparison vs. v0.6.0 Baseline
| Metric | v0.6.0 CRM Run (Nov log) | v0.6.1 Principle Run |
|--------|-------------------------|----------------------|
| Initial violations | 34 total (see `history/CONSTRAINT_TWEAKS_NOV2025.md`) | 2 (domain side effects only) |
| Iterations to stabilize Phase 2 | 4+ (bounced between 2-9 violations) | 2 |
| Shared schema location | Forced `packages/shared-types` even for single repo | Stayed in `src/contracts/` without warnings |
| File proliferation | Agents split cohesive modules to satisfy export caps | Kept schema + DTOs co-located (4 exports) |
| Naming drift | Agents created both `infra/` and `infrastructure/` folders | Only `src/app` + `src/domain` existed; aliases consistent |

## Takeaways
1. Allowing contextual schema patterns prevented unnecessary monorepo scaffolding while still guaranteeing a canonical Zod source.
2. Cohesion-focused complexity guidance kept related exports together, eliminating the "split everything at 3 exports" churn.
3. Alias detection plus rationale removed the impulse to create duplicate layer folders; short vs. long names are now documented choices rather than hidden rules.
4. Remaining cleanup work in this scenario related to domain purity (not part of this epic) and was resolved in the second iteration.
