# Specification: Second-Round Quality Improvement - Examples, Checklist & Order

## 1. Overview

After implementing quick tips (v0.5.9), test results show only 10% violation reduction (30 → 27) vs target 60% (30 → <12). The tips are too generic—they tell "where" but not "how."

This spec adds three complementary improvements:
1. **Concrete examples** in constraint metadata showing actual path transformations
2. **Dynamic architecture checklist** generated from enabled constraints
3. **Implementation order guidance** to prevent bottom-up mistakes

**Goal:** Reduce first-run violations from 27 to <12 (55% reduction from current baseline)

---

## 2. Problem Analysis

### Current State (v0.5.9 with Quick Tips)
- **27 violations** on first `cda run --exec`
- Tips helped slightly but not enough
- Violation breakdown:
  - single-responsibility: 4
  - clean-layer-direction: 1
  - central-config-entrypoint: 1
  - structural-naming-consistency: 1
  - module-complexity-guardrails: 3
  - observability-discipline: 7
  - test-coverage-contracts: 9
  - shared-types-zod-source-of-truth: 1
  - zod-contracts: 1

### Root Cause
**Quick tips are directional but not instructional.**

Example current tip:
```
"Tests mirror production structure: src/domain/contact.ts → src/domain/contact.test.ts"
```

Agent's confusion:
- "I have `apps/api/src/features/contacts/domain/contact.ts`"
- "Where exactly does the test go?"
- "Is it `apps/api/src/features/contacts/domain/contact.test.ts`?"
- "Or `tests/features/contacts/domain/contact.test.ts`?"
- "Or `apps/api/tests/domain/contact.test.ts`?"

The tip shows **simple case** but agent has **complex monorepo structure**.

---

## 3. Design Principles

### Must-Have
- ✅ **Concrete:** Show actual file paths, not abstractions
- ✅ **Dynamic:** Adapt to enabled constraints (like quick tips)
- ✅ **Actionable:** Agent can copy-paste patterns
- ✅ **Incremental:** Works with existing quick tips (additive)

### Nice-to-Have
- Minimal token overhead (<2000 chars added)
- Easy to maintain (co-located with constraints)
- Backward compatible (new fields are optional)

---

## 4. Feature 1: Concrete Examples in Constraints

### 4.1 Add `quick_example` Field

**Schema Addition:**
```typescript
// In src/core/types.ts
export interface ConstraintMeta {
  // ... existing fields ...
  quick_tip?: string;        // One-line guidance (v0.5.9)
  quick_example?: string;    // NEW: Multi-line concrete example
}
```

### 4.2 Example Format

**Constraint:** test-coverage-contracts.md

```yaml
---
id: test-coverage-contracts
quick_tip: "Tests mirror production structure: src/domain/contact.ts → src/domain/contact.test.ts"
quick_example: |
  Given production file:
    apps/api/src/features/contacts/domain/contact.ts
  
  Create test file:
    apps/api/src/features/contacts/domain/contact.test.ts
  
  Pattern: {same-directory}/{filename}.test.{extension}
  
  More examples:
    packages/shared-types/schemas/contact.ts
    → packages/shared-types/schemas/contact.test.ts
    
    apps/web/src/components/ContactList.tsx
    → apps/web/src/components/ContactList.test.tsx
---
```

### 4.3 Priority Constraints for Examples

Add `quick_example` to constraints with highest violation counts:

1. **test-coverage-contracts** (9 violations) - Show test file placement patterns
2. **observability-discipline** (7 violations) - Show logger import and usage
3. **single-responsibility** (4 violations) - Show file splitting examples
4. **module-complexity-guardrails** (3 violations) - Show proper module boundaries
5. **structural-naming-consistency** (1 violation) - Show feature folder structure
6. **shared-types-zod-source-of-truth** (1 violation) - Show schema import paths
7. **central-config-entrypoint** (1 violation) - Show getConfig() usage
8. **clean-layer-direction** (1 violation) - Show valid vs invalid imports

### 4.4 Visual Format in Prompt

Examples appear in expanded section after quick tips:

```
===== COMMON FIRST-RUN PITFALLS =====

• Tests mirror production structure: src/domain/contact.ts → src/domain/contact.test.ts
• No console.log in features; create infra/telemetry adapter for all logging
• Max 3 exports per file (5 for index.ts barrels or feature entry files)

===== END PITFALLS =====

===== PATTERN EXAMPLES (Concrete Implementation) =====

[test-coverage-contracts]
Given production file:
  apps/api/src/features/contacts/domain/contact.ts

Create test file:
  apps/api/src/features/contacts/domain/contact.test.ts

Pattern: {same-directory}/{filename}.test.{extension}

More examples:
  packages/shared-types/schemas/contact.ts
  → packages/shared-types/schemas/contact.test.ts

---

[observability-discipline]
❌ DON'T:
  console.log('Creating contact', contact);

✅ DO:
  // 1. Create logger adapter (once)
  // infra/telemetry/logger.ts
  export const logger = {
    info: (msg: string, context?: any) => console.log(msg, context)
  };
  
  // 2. Use in features
  // app/contacts/contact-service.ts
  import { logger } from '../../infra/telemetry/logger';
  logger.info('Creating contact', { contactId: contact.id });

---

[single-responsibility]
❌ TOO MANY EXPORTS (6 exports):
  // domain/contact/contact.ts
  export class Contact { ... }
  export class ContactList { ... }
  export interface ContactRepository { ... }
  export type ContactId = string;
  export const validateEmail = ...;
  export const formatName = ...;

✅ SPLIT INTO FILES (3 exports each):
  // domain/contact/contact.ts
  export class Contact { ... }
  export type ContactId = string;
  export const validateEmail = ...;
  
  // domain/contact/contact-list.ts
  export class ContactList { ... }
  
  // domain/contact/contact-repository.ts
  export interface ContactRepository { ... }

===== END PATTERN EXAMPLES =====
```

### 4.5 Prompt Assembly Integration

**File:** `src/core/promptAssembler.ts`

**New Function:**
```typescript
/**
 * Generate concrete examples section from enabled constraints with quick_example.
 */
function buildPatternExamplesSection(enabledConstraints: ConstraintDocument[]): string {
  const examples = enabledConstraints
    .filter(doc => doc.meta.quick_example)
    .map(doc => {
      const lines = [
        `[${doc.meta.id}]`,
        doc.meta.quick_example.trim(),
        ''
      ];
      return lines.join('\n');
    });
  
  if (examples.length === 0) {
    return '';
  }
  
  const lines: string[] = [];
  lines.push('');
  lines.push('===== PATTERN EXAMPLES (Concrete Implementation) =====');
  lines.push('');
  lines.push(...examples);
  lines.push('===== END PATTERN EXAMPLES =====');
  lines.push('');
  
  return lines.join('\n');
}
```

**Injection Point:** After quick tips, before checklist

---

## 5. Feature 2: Dynamic Architecture Checklist

### 5.1 Add `checklist_item` Field

**Schema Addition:**
```typescript
// In src/core/types.ts
export interface ConstraintMeta {
  // ... existing fields ...
  quick_tip?: string;
  quick_example?: string;
  checklist_item?: string;  // NEW: Question for pre-implementation checklist
}
```

### 5.2 Checklist Item Format

**Purpose:** Create "mental checkpoint" questions agent must answer before coding

**Format:** Question that tests architectural understanding

**Examples:**

```yaml
# domain-purity.md
checklist_item: "Can I code domain entities without importing Zod, ORMs, or frameworks?"

# test-coverage-contracts.md
checklist_item: "Do I know where test files go? (same directory as production, add .test suffix)"

# central-config-entrypoint.md
checklist_item: "Will I access config via getConfig() from infra/config/index.ts (never process.env directly)?"

# observability-discipline.md
checklist_item: "Will I import logger from infra/telemetry/logger.ts (never console.log directly)?"

# single-responsibility.md
checklist_item: "Am I keeping files under 3 exports (5 for index.ts barrels)?"

# shared-types-zod-source-of-truth.md
checklist_item: "Will I put all Zod schemas in packages/shared-types and import via @shared-types?"

# structural-naming-consistency.md
checklist_item: "Do my feature folders match across layers? (domain/contacts, app/contacts, infra/contacts)"

# clean-layer-direction.md
checklist_item: "Does domain import nothing? (UI → App → Domain ← Infra dependency flow)"
```

### 5.3 Visual Format in Prompt

```
===== ARCHITECTURE CHECKLIST (Review Before Coding) =====

Your active constraints require understanding these patterns.
Can you answer YES to each question?

□ Can I code domain entities without importing Zod, ORMs, or frameworks?
  → Constraint: domain-purity

□ Will I put all Zod schemas in packages/shared-types and import via @shared-types?
  → Constraint: shared-types-zod-source-of-truth

□ Will I access config via getConfig() from infra/config/index.ts (never process.env)?
  → Constraint: central-config-entrypoint

□ Will I import logger from infra/telemetry/logger.ts (never console.log)?
  → Constraint: observability-discipline

□ Do I know where test files go? (same directory as production, add .test suffix)
  → Constraint: test-coverage-contracts

□ Am I keeping files under 3 exports (5 for index.ts barrels)?
  → Constraint: single-responsibility

□ Do my feature folders match across layers? (domain/contacts, app/contacts, infra/contacts)
  → Constraint: structural-naming-consistency

□ Does domain import nothing? (UI → App → Domain ← Infra dependency flow)
  → Constraint: clean-layer-direction

If you answered NO to any question, review the examples above.

===== END CHECKLIST =====
```

### 5.4 Prompt Assembly Integration

**File:** `src/core/promptAssembler.ts`

**New Function:**
```typescript
/**
 * Generate architecture checklist from enabled constraints with checklist_item.
 */
function buildArchitectureChecklist(enabledConstraints: ConstraintDocument[]): string {
  const items = enabledConstraints
    .filter(doc => doc.meta.checklist_item)
    .map(doc => {
      return `□ ${doc.meta.checklist_item}\n  → Constraint: ${doc.meta.id}`;
    });
  
  if (items.length === 0) {
    return '';
  }
  
  const lines: string[] = [];
  lines.push('');
  lines.push('===== ARCHITECTURE CHECKLIST (Review Before Coding) =====');
  lines.push('');
  lines.push('Your active constraints require understanding these patterns.');
  lines.push('Can you answer YES to each question?');
  lines.push('');
  lines.push(...items);
  lines.push('');
  lines.push('If you answered NO to any question, review the examples above.');
  lines.push('');
  lines.push('===== END CHECKLIST =====');
  lines.push('');
  
  return lines.join('\n');
}
```

**Injection Point:** After pattern examples, before implementation order

---

## 6. Feature 3: Implementation Order Guidance

### 6.1 Static Implementation Strategy Section

**Purpose:** Prevent "bottom-up" mistakes where agents create domain entities with framework imports

**Content:** Layer-by-layer implementation order with validation checkpoints

### 6.2 Visual Format in Prompt

```
===== RECOMMENDED IMPLEMENTATION ORDER =====

To minimize violations, build the architecture layer-by-layer.
Run `cda run --exec` after each phase to catch issues early.

Phase 1: FOUNDATION (Infrastructure Setup)
  Files to create first:
  □ packages/shared-types/schemas/*.ts (Zod schemas ONLY)
  □ infra/config/index.ts (export getConfig() function)
  □ infra/telemetry/logger.ts (logging adapter)
  
  Checkpoint: Run `cda run --exec` → Expect 0 violations

Phase 2: DOMAIN (Pure Business Logic)
  Files to create:
  □ domain/{feature}/{entity}.ts (plain TypeScript classes/interfaces)
  □ domain/{feature}/{entity}-repository.ts (port interfaces)
  □ domain/{feature}/{entity}.test.ts (domain tests in same directory)
  
  Rules:
  - NO imports from app/infra/ui
  - NO framework imports (no Zod, no ORMs, no HTTP libraries)
  - Only TypeScript standard library
  
  Checkpoint: Run `cda run --exec` → Expect 0-2 violations

Phase 3: INFRASTRUCTURE (Adapters & Implementation)
  Files to create:
  □ infra/{feature}/{entity}-repository-impl.ts (implement domain ports)
  □ infra/{feature}/{entity}-dto.ts (toDto/fromDto mapper functions)
  □ infra/{feature}/*.test.ts (infra tests)
  
  Rules:
  - Can import from domain (implementing ports)
  - Can use frameworks (Prisma, Axios, etc.)
  - Keep files under 3 exports
  
  Checkpoint: Run `cda run --exec` → Expect 0-5 violations

Phase 4: APPLICATION (Use Cases & Services)
  Files to create:
  □ app/{feature}/{entity}-service.ts (orchestrate domain + infra)
  □ app/{feature}/{entity}-service.test.ts
  
  Rules:
  - Import from domain and infra
  - Use logger from infra/telemetry
  - Use getConfig() for configuration
  
  Checkpoint: Run `cda run --exec` → Expect 0-8 violations

Phase 5: PRESENTATION (API Routes / UI Components)
  Files to create:
  □ API: apps/api/src/routes/{feature}.ts
  □ Web: apps/web/src/components/{Feature}*.tsx
  
  Rules:
  - Call app services
  - Use DTOs from infra
  - Validate with Zod schemas from packages/shared-types
  
  Final validation: Run `cda run --exec` → Target <12 violations

===== END IMPLEMENTATION ORDER =====
```

### 6.3 Prompt Assembly Integration

**File:** `src/core/promptAssembler.ts`

**Implementation:**
```typescript
/**
 * Generate implementation order guidance (static for now).
 * This is not constraint-specific, so it's always included.
 */
function buildImplementationOrderSection(): string {
  const content = `
===== RECOMMENDED IMPLEMENTATION ORDER =====

To minimize violations, build the architecture layer-by-layer.
Run \`cda run --exec\` after each phase to catch issues early.

Phase 1: FOUNDATION (Infrastructure Setup)
  Files to create first:
  □ packages/shared-types/schemas/*.ts (Zod schemas ONLY)
  □ infra/config/index.ts (export getConfig() function)
  □ infra/telemetry/logger.ts (logging adapter)
  
  Checkpoint: Run \`cda run --exec\` → Expect 0 violations

Phase 2: DOMAIN (Pure Business Logic)
  Files to create:
  □ domain/{feature}/{entity}.ts (plain TypeScript classes/interfaces)
  □ domain/{feature}/{entity}-repository.ts (port interfaces)
  □ domain/{feature}/{entity}.test.ts (domain tests in same directory)
  
  Rules:
  - NO imports from app/infra/ui
  - NO framework imports (no Zod, no ORMs, no HTTP libraries)
  - Only TypeScript standard library
  
  Checkpoint: Run \`cda run --exec\` → Expect 0-2 violations

Phase 3: INFRASTRUCTURE (Adapters & Implementation)
  Files to create:
  □ infra/{feature}/{entity}-repository-impl.ts (implement domain ports)
  □ infra/{feature}/{entity}-dto.ts (toDto/fromDto mapper functions)
  □ infra/{feature}/*.test.ts (infra tests)
  
  Rules:
  - Can import from domain (implementing ports)
  - Can use frameworks (Prisma, Axios, etc.)
  - Keep files under 3 exports
  
  Checkpoint: Run \`cda run --exec\` → Expect 0-5 violations

Phase 4: APPLICATION (Use Cases & Services)
  Files to create:
  □ app/{feature}/{entity}-service.ts (orchestrate domain + infra)
  □ app/{feature}/{entity}-service.test.ts
  
  Rules:
  - Import from domain and infra
  - Use logger from infra/telemetry
  - Use getConfig() for configuration
  
  Checkpoint: Run \`cda run --exec\` → Expect 0-8 violations

Phase 5: PRESENTATION (API Routes / UI Components)
  Files to create:
  □ API: apps/api/src/routes/{feature}.ts
  □ Web: apps/web/src/components/{Feature}*.tsx
  
  Rules:
  - Call app services
  - Use DTOs from infra
  - Validate with Zod schemas from packages/shared-types
  
  Final validation: Run \`cda run --exec\` → Target <12 violations

===== END IMPLEMENTATION ORDER =====
`.trim();

  return '\n\n' + content + '\n';
}
```

**Injection Point:** After checklist, before directive

---

## 7. Complete Prompt Structure

**Updated prompt flow:**

```
1. Banner (AGENT VERIFICATION MODE)
2. Metadata block (run_id, timestamp, etc.)
3. Optional prompt_preamble
4. Raw instruction package from cda run
5. Quick Tips Section (v0.5.9 - existing)
6. *** Pattern Examples Section (NEW - Feature 1) ***
7. *** Architecture Checklist (NEW - Feature 2) ***
8. *** Implementation Order (NEW - Feature 3) ***
9. AGENT DIRECTIVE block
10. Optional postscript
11. Metrics (char count, token estimate)
```

**Rationale for ordering:**
- Tips → Examples → Checklist → Order creates **funnel effect**
- General guidance (tips) → Specific patterns (examples) → Self-test (checklist) → Action plan (order)
- Agent progressively gets more concrete guidance

---

## 8. Implementation Plan

### Phase 1: Constraint Metadata Updates (2-3 hours)

**Task 1.1:** Add fields to ConstraintMeta type
```typescript
export interface ConstraintMeta {
  // ... existing ...
  quick_tip?: string;
  quick_example?: string;     // NEW
  checklist_item?: string;    // NEW
}
```

**Task 1.2:** Add examples to 8 priority constraints
- test-coverage-contracts
- observability-discipline
- single-responsibility
- module-complexity-guardrails
- structural-naming-consistency
- shared-types-zod-source-of-truth
- central-config-entrypoint
- clean-layer-direction

**Task 1.3:** Add checklist items to same 8 constraints

---

### Phase 2: Prompt Assembly Updates (1-2 hours)

**Task 2.1:** Add `buildPatternExamplesSection()` function

**Task 2.2:** Add `buildArchitectureChecklist()` function

**Task 2.3:** Add `buildImplementationOrderSection()` function

**Task 2.4:** Update `assemblePrompt()` to inject all three sections:
```typescript
sections.push(instructionText);

// Existing (v0.5.9)
const quickTipsSection = buildQuickTipsSection(enabledConstraints);
if (quickTipsSection) sections.push(quickTipsSection);

// NEW
const examplesSection = buildPatternExamplesSection(enabledConstraints);
if (examplesSection) sections.push(examplesSection);

const checklistSection = buildArchitectureChecklist(enabledConstraints);
if (checklistSection) sections.push(checklistSection);

const orderSection = buildImplementationOrderSection();
sections.push(orderSection);

sections.push(directiveBlock);
```

---

### Phase 3: Testing (2-3 hours)

**Task 3.1:** Unit tests for new functions
- `buildPatternExamplesSection()` - filters constraints, formats examples
- `buildArchitectureChecklist()` - filters constraints, formats checklist
- `buildImplementationOrderSection()` - always returns content

**Task 3.2:** Integration tests
- Verify examples appear in prompt output
- Verify checklist adapts to enabled constraints
- Verify implementation order always appears
- Verify sections in correct order

**Task 3.3:** Manual end-to-end test
```bash
cda run --plan > prompt.txt
# Verify all sections present and in correct order
# Verify only enabled constraints appear in examples/checklist
```

**Task 3.4:** Update snapshots

---

### Phase 4: Documentation (1 hour)

**Task 4.1:** Update README.md prompt structure section

**Task 4.2:** Update CHANGELOG.md for v0.5.10

**Task 4.3:** Update SPECIFICATION_NEW.md with new fields

**Task 4.4:** Create release notes

---

### Phase 5: Validation & Release (1 hour)

**Task 5.1:** Full build & test suite

**Task 5.2:** Real agent test run (same CRM scenario)
- Measure violations on first `cda run --exec`
- Target: <12 violations (vs current 27)

**Task 5.3:** Commit & tag v0.5.10

---

## 9. Expected Impact

### Violation Reduction Estimates

**Feature 1 (Examples):**
- test-coverage-contracts: 9 → 3 (6 prevented)
- observability-discipline: 7 → 2 (5 prevented)
- single-responsibility: 4 → 2 (2 prevented)
- **Subtotal: ~13 violations prevented**

**Feature 2 (Checklist):**
- Creates mental checkpoint
- Estimated 20-30% additional reduction: ~3-5 violations prevented

**Feature 3 (Implementation Order):**
- Prevents bottom-up mistakes
- Estimated 15-25% additional reduction: ~2-4 violations prevented

**Total Expected Reduction:**
- Current: 27 violations
- After improvements: 7-12 violations
- **Reduction: 55-74%** (vs target 55%)

---

## 10. Success Criteria

### Must-Have (Release Blockers)
- [ ] All three sections appear in prompt output
- [ ] Examples and checklist respect enabled/disabled constraints
- [ ] Implementation order always appears
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] No breaking changes

### Success Metrics (Post-Release)
- [ ] First-run violations <12 (target met)
- [ ] Real agent test run shows improvement
- [ ] Agent transcript shows architectural understanding earlier

---

## 11. Token Overhead Analysis

**Estimated additions per section:**

- Quick Tips (v0.5.9): ~500 chars (10 tips × 50 chars)
- Pattern Examples: ~1500 chars (8 examples × ~180 chars)
- Architecture Checklist: ~600 chars (8 items × 75 chars)
- Implementation Order: ~1200 chars (static content)

**Total overhead: ~3800 chars (~950 tokens)**

**Impact:**
- Typical `cda run --plan` output: ~40KB (10K tokens)
- With additions: ~44KB (11K tokens)
- Increase: ~10% (acceptable for 55%+ violation reduction)

---

## 12. Risks & Mitigations

### Risk 1: Examples become outdated
**Mitigation:** Co-locate with constraints, review during updates

### Risk 2: Too much content overwhelms agent
**Mitigation:** Progressive disclosure (tips → examples → checklist → order)

### Risk 3: Static implementation order may not fit all projects
**Mitigation:** Start with static, gather feedback, make dynamic in future version

### Risk 4: Agents skip reading long sections
**Mitigation:** Visual markers, clear section headers, scannable format (checkboxes, bullets)

---

## 13. Future Enhancements

### 13.1 Dynamic Implementation Order
Generate order based on detected tech stack:
- Monorepo with shared-types → current order
- Single app → simplified order
- Microservices → service-specific order

### 13.2 Interactive Examples
`cda run --examples <constraint-id>` shows just examples for one constraint

### 13.3 Checklist Validation
`cda run --checklist` interactive mode where agent answers questions before proceeding

### 13.4 Example Contributions
Allow users to submit examples via `cda contribute-example`

---

## 14. Backward Compatibility

### Constraints Without New Fields
- Work exactly as before
- Examples and checklist sections omitted if no constraints have fields
- No errors or warnings

### Existing Projects
- No breaking changes
- Old prompts still work
- Users get improvements automatically on next `cda run --plan`

### Legacy Format
- New sections respect `--legacy-format` flag
- Tips, examples, checklist, and order all skipped in legacy mode

---

## 15. Rollout Plan

### Version: 0.5.10

**Changes:**
- Add `quick_example` and `checklist_item` to ConstraintMeta
- Add three new sections to prompt output
- Add examples and checklist items to 8 priority constraints
- Update tests and documentation

**Migration:**
- Automatic (no user action required)
- New sections appear in next `cda run --plan`

**Validation:**
- Run same CRM test scenario
- Measure first-run violations (target: <12)
- Gather agent transcript data

---

## 16. Open Questions

1. Should implementation order be constraint-aware? (Start with static, evolve later)
2. Should we limit number of examples per constraint? (Recommendation: max 3)
3. Should checklist items be yes/no questions or statements? (Recommendation: questions for engagement)
4. Should we add visual hierarchy to examples (✅/❌)? (Recommendation: yes for clarity)

---

## 17. Appendix: Example Constraint Updates

### test-coverage-contracts.md

```yaml
---
id: test-coverage-contracts
name: Test Coverage Contracts
category: testing
severity: error
enabled: true
optional: true
version: 1
group: best-practices
quick_tip: "Tests mirror production structure: src/domain/contact.ts → src/domain/contact.test.ts"
quick_example: |
  Given production file:
    apps/api/src/features/contacts/domain/contact.ts
  
  Create test file:
    apps/api/src/features/contacts/domain/contact.test.ts
  
  Pattern: {same-directory}/{filename}.test.{extension}
  
  More examples:
    packages/shared-types/schemas/contact.ts
    → packages/shared-types/schemas/contact.test.ts
    
    apps/web/src/components/ContactList.tsx
    → apps/web/src/components/ContactList.test.tsx
checklist_item: "Do I know where test files go? (same directory as production, add .test suffix)"
---
```

### observability-discipline.md

```yaml
---
id: observability-discipline
name: Observability Discipline
category: telemetry
severity: error
enabled: true
optional: true
version: 1
group: best-practices
quick_tip: "No console.log in features; create infra/telemetry adapter for all logging"
quick_example: |
  ❌ DON'T:
    console.log('Creating contact', contact);
  
  ✅ DO:
    // 1. Create logger adapter (once)
    // infra/telemetry/logger.ts
    export const logger = {
      info: (msg: string, ctx?: any) => console.log(msg, ctx)
    };
    
    // 2. Use in features
    // app/contacts/contact-service.ts
    import { logger } from '../../infra/telemetry/logger';
    logger.info('Creating contact', { contactId: contact.id });
checklist_item: "Will I import logger from infra/telemetry/logger.ts (never console.log directly)?"
---
```

### single-responsibility.md

```yaml
---
id: single-responsibility
name: Enforce Single Responsibility per File
category: structure
severity: error
enabled: true
version: 1
group: best-practices
quick_tip: "Max 3 exports per file (5 for index.ts barrels or feature entry files)"
quick_example: |
  ❌ TOO MANY (6 exports):
    // domain/contact/contact.ts
    export class Contact { ... }
    export class ContactList { ... }
    export interface ContactRepository { ... }
    export type ContactId = string;
    export const validateEmail = ...;
    export const formatName = ...;
  
  ✅ SPLIT (3 exports each):
    // domain/contact/contact.ts
    export class Contact { ... }
    export type ContactId = string;
    export const validateEmail = ...;
    
    // domain/contact/contact-list.ts
    export class ContactList { ... }
    
    // domain/contact/contact-repository.ts
    export interface ContactRepository { ... }
checklist_item: "Am I keeping files under 3 exports (5 for index.ts barrels)?"
---
```

---

## 18. Timeline & Effort

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1: Constraint Updates | 2-3 hours | None |
| Phase 2: Prompt Assembly | 1-2 hours | Phase 1 |
| Phase 3: Testing | 2-3 hours | Phase 2 |
| Phase 4: Documentation | 1 hour | Phase 3 |
| Phase 5: Validation & Release | 1 hour | Phase 4 |

**Total: 7-10 hours over 2-3 days**

---

## 19. Comparison to SPEC_FIRST.md

### What's Different

**SPEC_FIRST.md (v0.5.9):**
- Added `quick_tip` field (one-line guidance)
- Simple tips section in prompt
- Goal: 30 → <12 violations (60% reduction)
- Result: 30 → 27 violations (10% reduction)

**SPEC_SECOND.md (v0.5.10):**
- Adds `quick_example` field (multi-line concrete examples)
- Adds `checklist_item` field (pre-implementation questions)
- Adds three new prompt sections (examples, checklist, order)
- Goal: 27 → <12 violations (55% reduction from new baseline)

### Why This Will Work Better

1. **Concrete > Abstract:** Real file paths vs. simplified examples
2. **Self-Test:** Checklist forces agent to verify understanding
3. **Sequential:** Order prevents architectural mistakes upfront
4. **Cumulative:** Builds on quick tips, doesn't replace them

**Combined effect of v0.5.9 + v0.5.10:**
- Quick tips: Set direction
- Examples: Show exact patterns
- Checklist: Verify understanding
- Order: Prevent mistakes

Result: **Multi-layered safety net** instead of single tip line
