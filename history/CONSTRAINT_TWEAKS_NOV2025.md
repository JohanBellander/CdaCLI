# Constraint Tweaks - November 2025

## Context

Based on a real-world test run where an AI agent implemented a CRM solution following CDA constraints, we identified several areas where constraints were too rigid or unclear, causing excessive refactoring churn without architectural benefit.

## Test Run Summary

**Initial violations:** 34  
**After first pass:** 18  
**After multiple iterations:** Bounced between 2-9 violations  

The agent successfully moved from a naive Express + flat structure to a clean Fastify + layered architecture with proper ports/adapters, but struggled with several constraint interpretations.

## Changes Made

### 1. `single-responsibility.md` - Relaxed Barrel/Entry File Limits

**Problem:** Feature entry files and barrel exports that aggregate related interfaces triggered violations when they had 4-5 exports, even though this is a valid aggregation pattern.

**Solution:**
- Increased export threshold for `index.ts` and feature entry files (e.g., `contacts.ts` at feature root) from 3 to 5
- Added explicit allowance for feature root entry files that re-export submodules
- Updated validation algorithm to detect barrel/entry files and apply the higher threshold

**Rationale:** Barrel files and feature entries serve as public APIs for modules. Forcing them to split at 3 exports creates artificial file proliferation without architectural value.

---

### 2. `clean-layer-direction.md` - Clarified Infra→Domain Dependencies

**Problem:** The constraint flagged `infra→domain` imports as violations, causing confusion since adapters *must* implement domain ports (this is the core of clean architecture).

**Solution:**
- Explicitly documented that `infra→domain` imports are **EXPECTED** (adapters depend on domain interfaces)
- Added new FORBIDDEN rule: `infra→app` (infra should not import app layer)
- Updated validation algorithm to skip flagging `infra→domain` as a violation
- Clarified ALLOWED section with "EXPECTED: adapters depend on domain interfaces"

**Rationale:** In clean architecture (ports & adapters), the infrastructure layer *must* import and implement domain ports. This is not a violation—it's the intended pattern.

---

### 3. `domain-purity.md` - Enhanced Zod Schema Guidance

**Problem:** Agents put Zod schemas directly in `src/domain/entities/` files, violating domain purity but unsure where else to put them.

**Solution:**
- Added explicit FORBIDDEN rule: No Zod imports in domain entities
- Pointed to `shared-types-zod-source-of-truth` constraint for proper location
- Added ALLOWED rule: Domain can import TypeScript types inferred from Zod schemas (e.g., `import type { Contact } from '@shared-types'`)
- Clarified that domain should use plain TypeScript types/interfaces only

**Rationale:** Zod is a runtime validation framework; domain should be framework-agnostic. Schemas belong in `packages/shared-types` per the monorepo architecture.

---

### 4. `shared-types-zod-source-of-truth.md` - Added Common Mistake

**Problem:** Not cross-referenced with domain-purity, so agents didn't understand the connection.

**Solution:**
- Added to COMMON MISTAKES: "Putting Zod schemas in `src/domain/entities/` instead of `packages/shared-types/` (violates domain-purity)"

**Rationale:** Cross-referencing constraints helps agents understand the holistic architecture rather than treating each constraint in isolation.

---

### 5. `structural-naming-consistency.md` - Flexible Entry File Patterns

**Problem:** Constraint was ambiguous about whether entry files should be `index.ts` or `<slug>.ts`, causing agents to rename files repeatedly.

**Solution:**
- Clarified DEFINITIONS: Entry files can be either `index.ts` OR `<slug>.ts` (both are valid)
- Updated FORBIDDEN: Must have one or the other (not missing entirely)
- Updated ALLOWED: Both patterns are acceptable; choose consistently within a feature
- Updated validation algorithm: `findFile(dir, 'index.ts') or findFile(dir, slug + '.ts')`

**Rationale:** Both patterns are idiomatic in TypeScript. `index.ts` is the traditional barrel pattern; `<slug>.ts` provides explicit naming. Allow teams to choose their preference.

---

## Impact Assessment

### Expected Improvements

1. **Reduced false positives** for valid architectural patterns (infra→domain, barrel exports)
2. **Clearer guidance** on where to put Zod schemas (always shared-types)
3. **Less churn** around feature entry file naming and export counts
4. **Faster convergence** when agents iterate on violations

### Preserved Strictness

- Still enforce single responsibility for implementation files (threshold remains 3)
- Still prevent domain→app/ui imports
- Still require kebab-case feature slugs
- Still enforce layer isolation and dependency direction

### What We Learned

- **Constraints must distinguish between "implementation files" and "aggregation files"** (services vs. barrels)
- **Expected patterns need explicit documentation**, not just implied by absence from FORBIDDEN
- **Cross-references between constraints** help agents understand the bigger picture
- **Clean architecture's infra→domain flow** is counter-intuitive to dependency rules and needs special handling

---

## Testing

- `npm run build` - ✅ Passes
- `npm test -- tests/constraintLoader.test.ts` - ✅ All 9 tests pass
- Constraints still load, parse, and validate frontmatter correctly

---

## Next Steps

Consider:
1. Adding a **visual architecture diagram** to `ARCHITECTURE.md` showing expected dependency arrows
2. Creating a **"playbook"** section in `CDA.md` with worked examples of feature implementation
3. Testing these tweaks against the same CRM scenario to measure improvement
4. Gathering more real-world usage data to identify additional friction points

---

## Files Modified

- `src/constraints/core/single-responsibility.md`
- `src/constraints/core/clean-layer-direction.md`
- `src/constraints/core/domain-purity.md`
- `src/constraints/core/shared-types-zod-source-of-truth.md`
- `src/constraints/core/structural-naming-consistency.md`
