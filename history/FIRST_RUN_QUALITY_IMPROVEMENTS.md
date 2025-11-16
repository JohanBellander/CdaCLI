# First-Run Quality Improvements

## Problem Analysis

From the second CRM test run (Nov 15, 2025), the agent achieved the mandatory workflow correctly but produced **30 violations** on the first `cda run --exec`:

### Violation Breakdown (Initial Run)
1. **single-responsibility** (2) - Files with too many exports
2. **file-naming** (2) - Next.js routing files not PascalCase
3. **central-config-entrypoint** (1) - Direct process.env usage
4. **structural-naming-consistency** (2) - Missing feature entry files
5. **observability-discipline** (1) - Direct console.log usage
6. **test-coverage-contracts** (16) - Missing test files
7. **shared-types-zod-source-of-truth** (6) - Non-canonical imports

### Root Causes

**Agent didn't internalize the architecture before coding:**
- Step 3 says "Run `cda run --plan` and archive the result"
- Step 4 says "Implement planned changes while consulting the prompt"
- BUT: The agent likely skimmed or ignored the full architectural guidance from `cda run --plan`

**Common patterns not visible upfront:**
- Where do Zod schemas go? (answered only in constraint details)
- How should config be centralized? (buried in instructions)
- What's the telemetry pattern? (not obvious until violation)
- How should tests be organized? (requires reading test-coverage-contracts)

**Test files created incorrectly:**
- Placed in domain layer (violates domain-purity when importing Jest)
- Should mirror production structure but outside domain/

## Solution: Architecture Quick Reference

Added a **compact cheat sheet** directly into step 4 of `COMMAND_SEQUENCE`:

```typescript
const ARCHITECTURE_QUICK_REF = `
BEFORE coding, remember these patterns to avoid common first-run violations:

Structure:
• Monorepo: packages/shared-types (Zod schemas), apps/api (Fastify), apps/web (Next.js)
• Layers: domain/ (pure logic, no imports from app/infra), app/ (services), infra/ (adapters, config, telemetry)
• Feature folders: domain/contacts/, app/contacts/, infra/contacts/ (kebab-case, matching slugs across layers)

Critical patterns:
• Zod schemas → packages/shared-types ONLY (never in domain entities)
• Domain entities → plain TypeScript types (no Zod, no frameworks)
• Config → single infra/config/index.ts (exports getConfig()), never inline process.env
• Logging → infra/telemetry/logger.ts adapter (no direct console.log in features)
• DTOs/Mappers → infra layer (toDto/fromDto functions to separate domain from HTTP)
• Tests → mirror production structure (domain/contact/contact.test.ts for domain/contact/contact.ts)

Limits:
• Max 3 exports per file (5 for barrels/feature entries)
• Max 200 lines per file
• Max 3 nesting levels
• Infra→domain allowed (adapters implement ports), domain→app/infra FORBIDDEN
`;
```

### Design Principles

**Concise but complete:**
- ~20 lines of critical patterns
- Fits in agent's immediate working memory
- Doesn't replace the full `cda run --plan` output, augments it

**Pattern-focused, not rule-focused:**
- "Where does X go?" rather than "Don't violate constraint Y"
- Answers the questions agents ask during implementation

**Actionable locations:**
- Specific file paths (`packages/shared-types`, `infra/config/index.ts`)
- Concrete patterns (`toDto/fromDto`, `getConfig()`)

**Visual structure:**
- Bullet points for scanability
- Grouped by concern (Structure, Patterns, Limits)

## Expected Impact

### Violations Likely Prevented (First Run)

**High confidence (15-20 violations):**
- ✅ Zod in shared-types → prevents 6 schema violations
- ✅ Config entrypoint → prevents 1-3 process.env violations
- ✅ Telemetry adapter → prevents 1-2 console.log violations
- ✅ Mappers in infra → prevents 2-3 single-responsibility violations
- ✅ Test structure → prevents 5+ domain-purity violations from Jest imports

**Medium confidence (5-10 violations):**
- ✅ Feature naming consistency → prevents 2 structural violations
- ✅ Export limits awareness → prevents 1-2 single-responsibility violations
- ✅ Layer boundaries → prevents 2-4 clean-layer-direction violations

**Total estimated reduction: 20-30 violations → 5-10 violations** on first run.

### What Still Needs Iteration

Agents will still need to:
- Create complete test coverage (can't anticipate all 16 files upfront)
- Handle Next.js-specific naming conventions (might need framework hint)
- Fine-tune export counts in complex modules
- Address edge cases in nesting/complexity

But the **core architecture violations** should drop dramatically.

## Alternative Approaches Considered

### ❌ Add more detailed instructions to each constraint
**Problem:** Makes constraints harder to read, increases token count, spreads guidance across 25+ files.

### ❌ Create a separate ARCHITECTURE.md reference doc
**Problem:** Agents must remember to read it; not integrated into mandatory workflow.

### ❌ Inject guidance into `cda run --plan` output
**Problem:** Already ~40KB; agents often skim long prompts.

### ✅ Quick reference in mandatory step 4 (CHOSEN)
**Why:** 
- Impossible to skip (part of command sequence)
- Appears exactly when needed (right before implementation)
- Compact enough to fit in working memory
- Still requires reading full `cda run --plan` but primes agent's mental model

## Validation Strategy

### Immediate Testing
- ✅ Unit tests pass for `onboardCommand`
- ✅ Build succeeds
- ✅ Reference appears in generated `CDA.md`

### Future Testing
Run the same CRM scenario with updated `CDA.md`:
1. Bootstrap with `cda onboard`
2. Agent implements simple CRM
3. Measure violations on first `cda run --exec`
4. Target: **≤10 violations** (vs. 30 baseline)

### Success Metrics
- **Primary:** First-run violations drop by 60%+ (30 → <12)
- **Secondary:** Agent completes implementation faster (fewer refactor cycles)
- **Tertiary:** Agent demonstrates architecture understanding in earlier transcript entries

## Rollout

**Version:** 0.5.9 (next patch)

**Changes:**
- `src/core/cdaOnboardingGuide.ts` - Added `ARCHITECTURE_QUICK_REF` constant
- Modified step 4 in `COMMAND_SEQUENCE` to include quick reference
- No changes to constraint files or CLI commands

**User Impact:**
- Existing `CDA.md` files are unaffected (regenerate with `cda onboard --overwrite`)
- New projects automatically get improved onboarding
- No breaking changes

**Documentation:**
- Add to CHANGELOG.md: "Improved first-run architectural guidance in CDA.md onboarding checklist"
- Update README.md example if space permits (optional)

---

## Appendix: Full Test Run Transcript Analysis

### What the Agent Did Right
1. ✅ Followed mandatory command sequence exactly
2. ✅ Created proper monorepo structure
3. ✅ Used Fastify (not Express)
4. ✅ Organized features by layer
5. ✅ Eventually fixed violations through iteration

### What the Agent Did Wrong (First Attempt)
1. ❌ Put Zod schemas in domain entities (6 violations)
2. ❌ Used inline `process.env` in api-client (1 violation)
3. ❌ Direct `console.log` in controller (1 violation)
4. ❌ Too many exports in single files (2 violations)
5. ❌ Created test files in wrong locations (5+ violations)
6. ❌ Missing feature entry files (2 violations)
7. ❌ Used full paths instead of package aliases for shared-types (6 violations)

**Pattern:** Most violations were "where does X go?" placement errors, not logic errors.

**Insight:** The agent understood *what* to build but not *where* to build it. The quick reference directly addresses this gap.
