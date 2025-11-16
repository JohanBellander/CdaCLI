# Implementation Plan: Second-Round Quality Improvement

## Overview

Implement concrete examples, dynamic checklist, and implementation order guidance as specified in `SPEC_SECOND.md` to reduce first-run violations from 27 to <12.

**Target Version:** 0.5.10  
**Estimated Effort:** 7-10 hours total  
**Risk Level:** Low (additive changes, builds on v0.5.9)  
**Baseline:** 27 violations (after v0.5.9 quick tips)  
**Target:** <12 violations (55% reduction)

---

## Phase 1: Type System & Constraint Metadata (2-3 hours)

### Task 1.1: Update ConstraintMeta Type
**File:** `src/core/types.ts`

**Changes:**
```typescript
export interface ConstraintMeta {
  id: string;
  name: string;
  category: string;
  severity: 'error' | 'warning';
  enabled: boolean;
  optional: boolean;
  version: number;
  group: 'architecture' | 'patterns' | 'best-practices' | 'frameworks' | 'contracts';
  quick_tip?: string;        // v0.5.9 - existing
  quick_example?: string;    // NEW - multi-line concrete example
  checklist_item?: string;   // NEW - pre-implementation question
}
```

**Validation:**
- TypeScript compiles without errors
- Existing constraint loading still works
- New fields are optional

**Dependencies:** None  
**Estimated Time:** 15 minutes

---

### Task 1.2: Add Examples to test-coverage-contracts
**File:** `src/constraints/core/test-coverage-contracts.md`

**Changes:**
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

**Dependencies:** Task 1.1  
**Estimated Time:** 20 minutes

---

### Task 1.3: Add Examples to observability-discipline
**File:** `src/constraints/core/observability-discipline.md`

**Changes:**
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
      info: (msg: string, ctx?: any) => console.log(msg, ctx),
      error: (msg: string, err?: Error) => console.error(msg, err)
    };
    
    // 2. Use in features
    // app/contacts/contact-service.ts
    import { logger } from '../../infra/telemetry/logger';
    logger.info('Creating contact', { contactId: contact.id });
checklist_item: "Will I import logger from infra/telemetry/logger.ts (never console.log directly)?"
---
```

**Dependencies:** Task 1.1  
**Estimated Time:** 20 minutes

---

### Task 1.4: Add Examples to single-responsibility
**File:** `src/constraints/core/single-responsibility.md`

**Changes:**
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

**Dependencies:** Task 1.1  
**Estimated Time:** 20 minutes

---

### Task 1.5: Add Examples to module-complexity-guardrails
**File:** `src/constraints/core/module-complexity-guardrails.md`

**Changes:**
```yaml
---
id: module-complexity-guardrails
name: Module Complexity Guardrails
category: complexity
severity: error
enabled: true
optional: true
version: 1
group: best-practices
quick_tip: "Keep modules focused: max 200 lines, 3 exports, 3 nesting levels per file"
quick_example: |
  ❌ COMPLEX MODULE (mixed concerns):
    // services/contact-handler.ts (300 lines)
    export class ContactValidator { ... }
    export class ContactRepository { ... }
    export class ContactEmailSender { ... }
    export class ContactFormatter { ... }
    export const utils = { ... };
  
  ✅ SPLIT BY CONCERN:
    // domain/contact/contact-validator.ts (80 lines)
    export class ContactValidator { ... }
    
    // infra/contact/contact-repository.ts (120 lines)
    export class ContactRepository { ... }
    
    // infra/email/contact-email-sender.ts (90 lines)
    export class ContactEmailSender { ... }
checklist_item: "Are my files under 200 lines with focused responsibility?"
---
```

**Dependencies:** Task 1.1  
**Estimated Time:** 20 minutes

---

### Task 1.6: Add Examples to structural-naming-consistency
**File:** `src/constraints/core/structural-naming-consistency.md`

**Changes:**
```yaml
---
id: structural-naming-consistency
name: Structural Naming Consistency
category: conventions
severity: error
enabled: true
optional: true
version: 1
group: best-practices
quick_tip: "Feature folders must match across layers: domain/contacts/, app/contacts/, infra/contacts/"
quick_example: |
  Given feature: "contacts"
  
  Required structure:
    domain/contacts/
      ├── contact.ts
      ├── contact-repository.ts
      └── contact.test.ts
    
    app/contacts/
      ├── contact-service.ts
      └── contact-service.test.ts
    
    infra/contacts/
      ├── contact-repository-impl.ts
      ├── contact-dto.ts
      └── contact-repository-impl.test.ts
  
  ❌ INCONSISTENT:
    domain/contacts/  ✓
    app/contact-mgmt/  ✗ (mismatched slug)
    infra/contact-infra/  ✗ (mismatched slug)
checklist_item: "Do my feature folders match across layers? (domain/contacts, app/contacts, infra/contacts)"
---
```

**Dependencies:** Task 1.1  
**Estimated Time:** 20 minutes

---

### Task 1.7: Add Examples to shared-types-zod-source-of-truth
**File:** `src/constraints/core/shared-types-zod-source-of-truth.md`

**Changes:**
```yaml
---
id: shared-types-zod-source-of-truth
name: Shared Types as Zod Source of Truth
category: contracts-shared-types
severity: error
enabled: true
optional: false
version: 1
group: contracts
quick_tip: "All Zod schemas belong in packages/shared-types; import via @shared-types workspace alias"
quick_example: |
  ✅ CORRECT STRUCTURE:
    // packages/shared-types/schemas/contact.ts
    import { z } from 'zod';
    export const ContactSchema = z.object({
      id: z.string().uuid(),
      name: z.string().min(1),
      email: z.string().email()
    });
    export type Contact = z.infer<typeof ContactSchema>;
  
  ✅ USAGE IN API:
    // apps/api/src/routes/contacts.ts
    import { ContactSchema } from '@shared-types/schemas/contact';
    
    app.post('/contacts', async (req, res) => {
      const data = ContactSchema.parse(req.body);
      // ...
    });
  
  ❌ WRONG (Zod in domain):
    // domain/contact/contact.ts
    import { z } from 'zod';  // ✗ NO ZOD IN DOMAIN
    export const ContactSchema = z.object({ ... });
checklist_item: "Will I put all Zod schemas in packages/shared-types and import via @shared-types?"
---
```

**Dependencies:** Task 1.1  
**Estimated Time:** 20 minutes

---

### Task 1.8: Add Examples to central-config-entrypoint
**File:** `src/constraints/core/central-config-entrypoint.md`

**Changes:**
```yaml
---
id: central-config-entrypoint
name: Central Config Entrypoint
category: config
severity: error
enabled: true
optional: true
version: 1
group: best-practices
quick_tip: "Never use process.env directly; create single infra/config/index.ts exporting getConfig()"
quick_example: |
  ✅ CREATE CONFIG ENTRYPOINT:
    // infra/config/index.ts
    export function getConfig() {
      return {
        apiUrl: process.env.API_URL || 'http://localhost:3000',
        dbUrl: process.env.DATABASE_URL!,
        logLevel: process.env.LOG_LEVEL || 'info'
      };
    }
  
  ✅ USE IN FEATURES:
    // app/contacts/contact-service.ts
    import { getConfig } from '../../infra/config';
    
    const config = getConfig();
    const apiClient = new ApiClient(config.apiUrl);
  
  ❌ DON'T (inline process.env):
    // app/contacts/contact-service.ts
    const apiUrl = process.env.API_URL;  // ✗ FORBIDDEN
checklist_item: "Will I access config via getConfig() from infra/config/index.ts (never process.env directly)?"
---
```

**Dependencies:** Task 1.1  
**Estimated Time:** 20 minutes

---

### Task 1.9: Add Examples to clean-layer-direction
**File:** `src/constraints/core/clean-layer-direction.md`

**Changes:**
```yaml
---
id: clean-layer-direction
name: Clean Layer Direction
category: architecture-layering
severity: error
enabled: true
optional: true
version: 1
group: architecture
quick_tip: "Dependencies flow: UI → App → Domain ← Infra (infra implements domain ports, domain imports nothing)"
quick_example: |
  ✅ VALID IMPORTS:
    // UI Layer
    import { ContactService } from '../app/contacts/contact-service';
    
    // App Layer
    import { Contact } from '../domain/contact/contact';
    import { ContactRepository } from '../infra/contact/contact-repository';
    
    // Infra Layer
    import { Contact } from '../domain/contact/contact';  // implement ports
    
    // Domain Layer
    // NO IMPORTS from app/infra/ui - only standard library
  
  ❌ FORBIDDEN:
    // domain/contact/contact.ts
    import { logger } from '../infra/telemetry/logger';  // ✗ DOMAIN → INFRA
    
    // app/contacts/contact-service.ts
    import { prisma } from '../infra/db/client';  // ✗ APP → INFRA IMPL (use port)
checklist_item: "Does domain import nothing? (UI → App → Domain ← Infra dependency flow)"
---
```

**Dependencies:** Task 1.1  
**Estimated Time:** 20 minutes

---

### Task 1.10: Build and Copy Constraints
**Command:**
```bash
npm run build
```

**Action:** Ensures updated constraint markdown files are copied to `dist/constraints/core/`

**Dependencies:** Tasks 1.2-1.9  
**Estimated Time:** 2 minutes

---

**Phase 1 Checkpoint:**
- [ ] ConstraintMeta type updated with new fields
- [ ] 8 constraints have `quick_example` field
- [ ] 8 constraints have `checklist_item` field
- [ ] Build succeeds
- [ ] Examples are multi-line with concrete paths
- [ ] Checklist items are questions
- [ ] Manual test: Load constraints and verify new fields populated

---

## Phase 2: Prompt Assembly Functions (1-2 hours)

### Task 2.1: Add buildPatternExamplesSection Function
**File:** `src/core/promptAssembler.ts`

**Implementation:**
```typescript
/**
 * Generate concrete examples section from enabled constraints with quick_example.
 * Shows actual file paths and DO/DON'T patterns.
 * 
 * @param enabledConstraints - Array of constraint documents that are currently active
 * @returns Formatted examples section with visual markers, or empty string if no examples
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

**Export:** Add to module exports

**Dependencies:** Phase 1 complete  
**Estimated Time:** 30 minutes

---

### Task 2.2: Add buildArchitectureChecklist Function
**File:** `src/core/promptAssembler.ts`

**Implementation:**
```typescript
/**
 * Generate architecture checklist from enabled constraints with checklist_item.
 * Creates pre-implementation "mental checkpoint" for agent.
 * 
 * @param enabledConstraints - Array of constraint documents that are currently active
 * @returns Formatted checklist section with constraint references, or empty string if no items
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

**Export:** Add to module exports

**Dependencies:** Task 2.1  
**Estimated Time:** 30 minutes

---

### Task 2.3: Add buildImplementationOrderSection Function
**File:** `src/core/promptAssembler.ts`

**Implementation:**
```typescript
/**
 * Generate implementation order guidance (static for now).
 * Provides layer-by-layer approach with validation checkpoints.
 * This is not constraint-specific, so it's always included.
 * 
 * @returns Formatted implementation order section
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

**Export:** Add to module exports

**Dependencies:** Task 2.2  
**Estimated Time:** 20 minutes

---

### Task 2.4: Integrate All Sections into assemblePrompt
**File:** `src/core/promptAssembler.ts`

**Function to modify:** `assemblePrompt`

**Changes:**
```typescript
export function assemblePrompt(options: AssemblePromptOptions): PromptResult {
  const {
    runId,
    agentName,
    agentModel,
    instructionText,
    disabledConstraintIds,
    enabledConstraints,
    preamble,
    postscript,
    maxLength,
  } = options;

  // ... existing banner, metadata, directive building ...

  const sections: string[] = [];
  sections.push(banner);
  sections.push(metadataBlock);
  if (preamble) {
    sections.push(preamble);
  }
  sections.push(instructionText);
  
  // EXISTING (v0.5.9): Quick tips section
  const quickTipsSection = buildQuickTipsSection(enabledConstraints);
  if (quickTipsSection) {
    sections.push(quickTipsSection);
  }
  
  // NEW (v0.5.10): Pattern examples section
  const examplesSection = buildPatternExamplesSection(enabledConstraints);
  if (examplesSection) {
    sections.push(examplesSection);
  }
  
  // NEW (v0.5.10): Architecture checklist section
  const checklistSection = buildArchitectureChecklist(enabledConstraints);
  if (checklistSection) {
    sections.push(checklistSection);
  }
  
  // NEW (v0.5.10): Implementation order section (always included)
  const orderSection = buildImplementationOrderSection();
  sections.push(orderSection);
  
  sections.push(directiveBlock);
  if (postscript) {
    sections.push(postscript);
  }
  sections.push(metricsBlock);

  // ... rest of function unchanged ...
}
```

**Dependencies:** Tasks 2.1-2.3  
**Estimated Time:** 15 minutes

---

**Phase 2 Checkpoint:**
- [ ] `buildPatternExamplesSection()` function exists
- [ ] `buildArchitectureChecklist()` function exists
- [ ] `buildImplementationOrderSection()` function exists
- [ ] All three integrated into `assemblePrompt()`
- [ ] Sections appear in correct order: tips → examples → checklist → order
- [ ] Build succeeds
- [ ] Manual test: Generate prompt and verify all sections present

---

## Phase 3: Testing (2-3 hours)

### Task 3.1: Unit Test - buildPatternExamplesSection
**File:** `tests/promptAssembler.test.ts`

**Tests to add:**
```typescript
describe('buildPatternExamplesSection', () => {
  it('returns empty string when no constraints have examples', () => {
    const constraints = [
      { meta: { id: 'test1', quick_example: undefined } },
      { meta: { id: 'test2', quick_example: undefined } }
    ];
    const result = buildPatternExamplesSection(constraints);
    expect(result).toBe('');
  });

  it('generates section with examples from enabled constraints', () => {
    const constraints = [
      { meta: { id: 'c1', quick_example: 'Example 1 text\nLine 2' } },
      { meta: { id: 'c2', quick_example: 'Example 2 text' } }
    ];
    const result = buildPatternExamplesSection(constraints);
    expect(result).toContain('PATTERN EXAMPLES (Concrete Implementation)');
    expect(result).toContain('[c1]');
    expect(result).toContain('Example 1 text');
    expect(result).toContain('[c2]');
    expect(result).toContain('Example 2 text');
    expect(result).toContain('END PATTERN EXAMPLES');
  });

  it('filters out constraints without examples', () => {
    const constraints = [
      { meta: { id: 'c1', quick_example: 'Has example' } },
      { meta: { id: 'c2', quick_example: undefined } },
      { meta: { id: 'c3', quick_example: 'Another example' } }
    ];
    const result = buildPatternExamplesSection(constraints);
    expect(result).toContain('[c1]');
    expect(result).toContain('Has example');
    expect(result).toContain('[c3]');
    expect(result).toContain('Another example');
    expect(result).not.toContain('[c2]');
  });

  it('preserves multi-line formatting in examples', () => {
    const constraints = [
      { 
        meta: { 
          id: 'test', 
          quick_example: '✅ DO:\n  line 1\n  line 2\n\n❌ DON\'T:\n  wrong line' 
        } 
      }
    ];
    const result = buildPatternExamplesSection(constraints);
    expect(result).toContain('✅ DO:');
    expect(result).toContain('❌ DON\'T:');
    expect(result).toContain('line 1');
  });
});
```

**Dependencies:** Phase 2 complete  
**Estimated Time:** 45 minutes

---

### Task 3.2: Unit Test - buildArchitectureChecklist
**File:** `tests/promptAssembler.test.ts`

**Tests to add:**
```typescript
describe('buildArchitectureChecklist', () => {
  it('returns empty string when no constraints have checklist items', () => {
    const constraints = [
      { meta: { id: 'test', checklist_item: undefined } }
    ];
    const result = buildArchitectureChecklist(constraints);
    expect(result).toBe('');
  });

  it('generates checklist with items from enabled constraints', () => {
    const constraints = [
      { meta: { id: 'c1', checklist_item: 'Can I do X?' } },
      { meta: { id: 'c2', checklist_item: 'Will I do Y?' } }
    ];
    const result = buildArchitectureChecklist(constraints);
    expect(result).toContain('ARCHITECTURE CHECKLIST');
    expect(result).toContain('□ Can I do X?');
    expect(result).toContain('→ Constraint: c1');
    expect(result).toContain('□ Will I do Y?');
    expect(result).toContain('→ Constraint: c2');
    expect(result).toContain('END CHECKLIST');
  });

  it('filters out constraints without checklist items', () => {
    const constraints = [
      { meta: { id: 'c1', checklist_item: 'Question 1' } },
      { meta: { id: 'c2', checklist_item: undefined } },
      { meta: { id: 'c3', checklist_item: 'Question 2' } }
    ];
    const result = buildArchitectureChecklist(constraints);
    expect(result).toContain('Question 1');
    expect(result).toContain('Question 2');
    expect(result).not.toContain('c2');
  });

  it('includes review prompt at end', () => {
    const constraints = [
      { meta: { id: 'test', checklist_item: 'Test question?' } }
    ];
    const result = buildArchitectureChecklist(constraints);
    expect(result).toContain('If you answered NO to any question, review the examples above');
  });
});
```

**Dependencies:** Task 3.1  
**Estimated Time:** 45 minutes

---

### Task 3.3: Unit Test - buildImplementationOrderSection
**File:** `tests/promptAssembler.test.ts`

**Tests to add:**
```typescript
describe('buildImplementationOrderSection', () => {
  it('always returns content (not empty)', () => {
    const result = buildImplementationOrderSection();
    expect(result).toBeTruthy();
    expect(result.length).toBeGreaterThan(100);
  });

  it('includes all 5 phases', () => {
    const result = buildImplementationOrderSection();
    expect(result).toContain('Phase 1: FOUNDATION');
    expect(result).toContain('Phase 2: DOMAIN');
    expect(result).toContain('Phase 3: INFRASTRUCTURE');
    expect(result).toContain('Phase 4: APPLICATION');
    expect(result).toContain('Phase 5: PRESENTATION');
  });

  it('includes validation checkpoints', () => {
    const result = buildImplementationOrderSection();
    expect(result).toContain('Checkpoint:');
    expect(result).toContain('cda run --exec');
    expect(result).toContain('Expect 0 violations');
  });

  it('includes target violation count', () => {
    const result = buildImplementationOrderSection();
    expect(result).toContain('Target <12 violations');
  });

  it('includes proper visual markers', () => {
    const result = buildImplementationOrderSection();
    expect(result).toContain('===== RECOMMENDED IMPLEMENTATION ORDER =====');
    expect(result).toContain('===== END IMPLEMENTATION ORDER =====');
  });
});
```

**Dependencies:** Task 3.2  
**Estimated Time:** 30 minutes

---

### Task 3.4: Unit Test - assemblePrompt Integration
**File:** `tests/promptAssembler.test.ts`

**Tests to add:**
```typescript
describe('assemblePrompt with v0.5.10 sections', () => {
  it('includes all new sections when constraints have fields', () => {
    const result = assemblePrompt({
      runId: 'test-123',
      agentName: 'test-agent',
      instructionText: 'Test instructions',
      disabledConstraintIds: [],
      enabledConstraints: [
        { 
          meta: { 
            id: 'test', 
            quick_tip: 'Tip',
            quick_example: 'Example',
            checklist_item: 'Question?'
          }, 
          content: '', 
          sections: {} 
        }
      ]
    });
    
    const prompt = result.fullPrompt;
    
    // v0.5.9 section
    expect(prompt).toContain('COMMON FIRST-RUN PITFALLS');
    
    // v0.5.10 sections
    expect(prompt).toContain('PATTERN EXAMPLES (Concrete Implementation)');
    expect(prompt).toContain('ARCHITECTURE CHECKLIST');
    expect(prompt).toContain('RECOMMENDED IMPLEMENTATION ORDER');
  });

  it('preserves correct section order', () => {
    const result = assemblePrompt({
      runId: 'test-123',
      agentName: 'test-agent',
      instructionText: 'INSTRUCTIONS_MARKER',
      disabledConstraintIds: [],
      enabledConstraints: [
        { 
          meta: { 
            id: 'test', 
            quick_tip: 'T',
            quick_example: 'E',
            checklist_item: 'Q'
          }, 
          content: '', 
          sections: {} 
        }
      ]
    });
    
    const prompt = result.fullPrompt;
    const instructionsIdx = prompt.indexOf('INSTRUCTIONS_MARKER');
    const tipsIdx = prompt.indexOf('COMMON FIRST-RUN PITFALLS');
    const examplesIdx = prompt.indexOf('PATTERN EXAMPLES');
    const checklistIdx = prompt.indexOf('ARCHITECTURE CHECKLIST');
    const orderIdx = prompt.indexOf('RECOMMENDED IMPLEMENTATION ORDER');
    const directiveIdx = prompt.indexOf('AGENT DIRECTIVE');
    
    expect(instructionsIdx).toBeGreaterThan(-1);
    expect(tipsIdx).toBeGreaterThan(instructionsIdx);
    expect(examplesIdx).toBeGreaterThan(tipsIdx);
    expect(checklistIdx).toBeGreaterThan(examplesIdx);
    expect(orderIdx).toBeGreaterThan(checklistIdx);
    expect(directiveIdx).toBeGreaterThan(orderIdx);
  });

  it('omits optional sections when constraints lack fields', () => {
    const result = assemblePrompt({
      runId: 'test-123',
      agentName: 'test-agent',
      instructionText: 'Test',
      disabledConstraintIds: [],
      enabledConstraints: [
        { 
          meta: { 
            id: 'test',
            // No quick_tip, quick_example, or checklist_item
          }, 
          content: '', 
          sections: {} 
        }
      ]
    });
    
    const prompt = result.fullPrompt;
    
    // Should not have tips, examples, or checklist
    expect(prompt).not.toContain('COMMON FIRST-RUN PITFALLS');
    expect(prompt).not.toContain('PATTERN EXAMPLES');
    expect(prompt).not.toContain('ARCHITECTURE CHECKLIST');
    
    // Should always have implementation order
    expect(prompt).toContain('RECOMMENDED IMPLEMENTATION ORDER');
  });

  it('implementation order always appears even without other sections', () => {
    const result = assemblePrompt({
      runId: 'test-123',
      agentName: 'test-agent',
      instructionText: 'Test',
      disabledConstraintIds: [],
      enabledConstraints: []
    });
    
    expect(result.fullPrompt).toContain('RECOMMENDED IMPLEMENTATION ORDER');
  });
});
```

**Dependencies:** Task 3.3  
**Estimated Time:** 45 minutes

---

### Task 3.5: Integration Test - Agent Command with New Sections
**File:** `tests/agent/agentPrompt.test.ts`

**Tests to add:**
```typescript
describe('agent prompt with v0.5.10 sections', () => {
  it('includes examples from enabled constraints in dry-run', async () => {
    const cwd = await createTempDir();
    await setupTestProject(cwd, {
      constraints: ['test-coverage-contracts', 'observability-discipline']
    });
    
    const output = await captureOutput(() => 
      runAgentCommand(['--dry-run'], { cwd })
    );
    
    expect(output).toContain('PATTERN EXAMPLES');
    expect(output).toContain('[test-coverage-contracts]');
    expect(output).toContain('[observability-discipline]');
    expect(output).toContain('Given production file:');
    expect(output).toContain('console.log');
  });

  it('includes checklist items from enabled constraints', async () => {
    const cwd = await createTempDir();
    await setupTestProject(cwd, {
      constraints: ['single-responsibility', 'structural-naming-consistency']
    });
    
    const output = await captureOutput(() => 
      runAgentCommand(['--dry-run'], { cwd })
    );
    
    expect(output).toContain('ARCHITECTURE CHECKLIST');
    expect(output).toContain('Am I keeping files under 3 exports');
    expect(output).toContain('feature folders match across layers');
  });

  it('always includes implementation order', async () => {
    const cwd = await createTempDir();
    await setupDefaultProject(cwd);
    
    const output = await captureOutput(() => 
      runAgentCommand(['--dry-run'], { cwd })
    );
    
    expect(output).toContain('RECOMMENDED IMPLEMENTATION ORDER');
    expect(output).toContain('Phase 1: FOUNDATION');
    expect(output).toContain('Phase 5: PRESENTATION');
  });

  it('respects disabled constraints for examples and checklist', async () => {
    const cwd = await createTempDir();
    await setupTestProject(cwd, {
      constraints: ['test-coverage-contracts'],
      disabledConstraints: ['observability-discipline']
    });
    
    const output = await captureOutput(() => 
      runAgentCommand(['--dry-run'], { cwd })
    );
    
    expect(output).toContain('[test-coverage-contracts]');
    expect(output).not.toContain('[observability-discipline]');
    expect(output).not.toContain('console.log');
  });
});
```

**Dependencies:** Task 3.4  
**Estimated Time:** 1 hour

---

### Task 3.6: Update Existing Snapshots
**Files:** `tests/**/__snapshots__/*.snap`

**Action:** Update snapshots that capture prompt output

**Commands:**
```bash
npm test -- --updateSnapshot
```

**Review:** Manually verify snapshot changes show:
- Tips section (v0.5.9 - existing)
- Pattern examples section (NEW)
- Architecture checklist section (NEW)
- Implementation order section (NEW)
- All in correct order

**Dependencies:** Task 3.5  
**Estimated Time:** 20 minutes

---

### Task 3.7: Manual End-to-End Testing
**Test Cases:**

**Test 1: All sections appear**
```bash
cd /tmp/test-project
cda init
cda run --plan > prompt.txt

# Verify all sections present
grep "COMMON FIRST-RUN PITFALLS" prompt.txt
grep "PATTERN EXAMPLES" prompt.txt
grep "ARCHITECTURE CHECKLIST" prompt.txt
grep "RECOMMENDED IMPLEMENTATION ORDER" prompt.txt

# Verify examples from enabled constraints
grep "\[test-coverage-contracts\]" prompt.txt
grep "\[observability-discipline\]" prompt.txt
```

**Test 2: Sections respect disabled constraints**
```bash
cda config  # Disable test-coverage-contracts
cda run --plan > prompt2.txt

# Verify disabled constraint's content is absent
! grep "test-coverage-contracts" prompt2.txt
# But implementation order still present
grep "RECOMMENDED IMPLEMENTATION ORDER" prompt2.txt
```

**Test 3: Section ordering**
```bash
# Extract line numbers of each section
grep -n "COMMON FIRST-RUN PITFALLS" prompt.txt
grep -n "PATTERN EXAMPLES" prompt.txt
grep -n "ARCHITECTURE CHECKLIST" prompt.txt
grep -n "RECOMMENDED IMPLEMENTATION ORDER" prompt.txt
grep -n "AGENT DIRECTIVE" prompt.txt

# Verify: pitfalls < examples < checklist < order < directive
```

**Test 4: Multi-line formatting preserved**
```bash
# Verify examples show proper formatting
grep -A 10 "\[observability-discipline\]" prompt.txt | grep "✅ DO:"
grep -A 10 "\[observability-discipline\]" prompt.txt | grep "❌ DON'T:"
```

**Dependencies:** Task 3.6  
**Estimated Time:** 30 minutes

---

**Phase 3 Checkpoint:**
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] Snapshots updated and reviewed
- [ ] Manual tests verify all sections appear
- [ ] Sections respect enabled/disabled constraints
- [ ] Section ordering correct
- [ ] Multi-line formatting preserved
- [ ] Full test suite passes: `npm test`

---

## Phase 4: Documentation (1 hour)

### Task 4.1: Update README.md
**File:** `README.md`

**Section to update:** "Unified `cda run` Workflow" → "Prompt Structure"

**Changes:**
```markdown
### Prompt Structure

`cda run --plan` and `cda run --exec` both emit the same agent prompt:

1. **Banner:** `AGENT VERIFICATION MODE: PROMPT INTENDED FOR AUTOMATED EXECUTION`
2. **Metadata block:** `run_id`, ISO timestamp, `instruction_format_version`, `agent_name`, optional `agent_model`, `token_estimate_method`
3. **Optional prompt_preamble** from `cda.agents.json`
4. **Raw instruction package** emitted by `cda run` (batch or single constraint) with AGENT ACTION REQUIRED / DO NOT blocks and expanded report skeleton
5. **Quick tips section** (v0.5.9): One-line guidance from enabled constraints with `quick_tip` field
6. **Pattern examples section** (v0.5.10 - NEW): Concrete implementation examples with actual file paths from enabled constraints with `quick_example` field
7. **Architecture checklist** (v0.5.10 - NEW): Pre-implementation questions from enabled constraints with `checklist_item` field
8. **Implementation order guidance** (v0.5.10 - NEW): Layer-by-layer approach with validation checkpoints (always included)
9. **Directive block:** Reminding agent to execute detection/remediation steps verbatim
10. **Optional postscript**
11. **Metrics:** `original_char_count` and `approx_token_length` (chars ÷ 4 heuristic)

Sections 5-8 are **dynamic** - they adapt based on your enabled constraints. Sections 6-7 only appear if constraints define the relevant fields. Section 8 (implementation order) always appears.

The layered guidance (tips → examples → checklist → order) creates a "funnel effect" that progressively guides agents from general patterns to specific actions.
```

**Dependencies:** None  
**Estimated Time:** 20 minutes

---

### Task 4.2: Update CHANGELOG.md
**File:** `CHANGELOG.md`

**Version:** 0.5.10 (unreleased)

**Entry:**
```markdown
## [0.5.10] - 2025-11-16

### Added
- Concrete pattern examples in agent prompts
  - New `quick_example` field in constraint metadata for multi-line examples
  - Shows actual file paths and DO/DON'T patterns
  - 8 priority constraints include examples (test-coverage, observability, single-responsibility, etc.)
  
- Dynamic architecture checklist in agent prompts
  - New `checklist_item` field for pre-implementation questions
  - Creates mental checkpoint before coding
  - Adapts based on enabled constraints
  
- Implementation order guidance in agent prompts
  - 5-phase layer-by-layer approach (Foundation → Domain → Infra → App → UI)
  - Validation checkpoints after each phase
  - Prevents bottom-up architectural mistakes
  - Always included (not constraint-specific)

### Changed
- Prompt structure now includes 3 additional sections after quick tips
- Section ordering: tips → examples → checklist → implementation order
- Total prompt overhead: ~3800 chars (~950 tokens)

### Target
- Reduce first-run violations from 27 to <12 (55% reduction from v0.5.9 baseline)
```

**Dependencies:** None  
**Estimated Time:** 10 minutes

---

### Task 4.3: Update SPECIFICATION_NEW.md
**File:** `SPECIFICATION_NEW.md`

**Section to update:** "5. Constraint Asset Model"

**Addition:**
```markdown
Each constraint markdown file contains:
- YAML frontmatter with metadata:
  - `id`, `name`, `category`, `severity`, `enabled`, `optional`, `version`, `group`
  - `quick_tip` (v0.5.9): Optional one-line guidance string
  - `quick_example` (v0.5.10): Optional multi-line concrete example with actual paths
  - `checklist_item` (v0.5.10): Optional pre-implementation question
- Sectioned plain-text protocol (PURPOSE, SCOPE, DEFINITIONS, etc.)
- Optional report_fields for output formatting

**Field Usage:**
- `quick_tip`: Appears in "Common First-Run Pitfalls" section
- `quick_example`: Appears in "Pattern Examples (Concrete Implementation)" section with ✅/❌ patterns
- `checklist_item`: Appears in "Architecture Checklist (Review Before Coding)" section as checkbox questions

All three fields are optional. Constraints work without them, but including them improves first-run quality by providing progressive guidance (tips → examples → self-test).
```

**Section to update:** "9. Agent Prompt Directive (Non-Legacy)"

**Addition:**
```markdown
After the instruction package, `assemblePrompt` injects guidance sections:

1. **Quick tips** (v0.5.9): One-line patterns from constraints with `quick_tip`
2. **Pattern examples** (v0.5.10): Concrete examples from constraints with `quick_example`
3. **Architecture checklist** (v0.5.10): Questions from constraints with `checklist_item`
4. **Implementation order** (v0.5.10): Static 5-phase layer-by-layer guidance (always included)

Sections 1-3 are omitted if no enabled constraints have the relevant fields. Section 4 always appears.

This creates a "funnel effect": general guidance → specific patterns → self-test → action plan.
```

**Dependencies:** None  
**Estimated Time:** 15 minutes

---

### Task 4.4: Create Release Notes
**File:** `docs/RELEASE_NOTES_0.5.10.md`

**Content:**
```markdown
# Release Notes: v0.5.10 - Concrete Examples, Checklist & Implementation Order

## Overview

Building on v0.5.9's quick tips, this release adds three complementary improvements to reduce first-run violations from 27 to <12.

## Key Features

### 1. Concrete Pattern Examples
- **New field:** `quick_example` in constraint metadata
- **Shows:** Actual file paths, DO/DON'T patterns, real code snippets
- **Format:** Multi-line examples with visual markers (✅/❌)
- **Coverage:** 8 priority constraints (test-coverage, observability, single-responsibility, module-complexity, structural-naming, shared-types, central-config, clean-layer)

**Example:**
```
[test-coverage-contracts]
Given production file:
  apps/api/src/features/contacts/domain/contact.ts

Create test file:
  apps/api/src/features/contacts/domain/contact.test.ts

Pattern: {same-directory}/{filename}.test.{extension}
```

### 2. Dynamic Architecture Checklist
- **New field:** `checklist_item` in constraint metadata
- **Creates:** Pre-implementation "mental checkpoint"
- **Format:** Yes/no questions linked to constraints
- **Dynamic:** Only shows items for enabled constraints

**Example:**
```
□ Do I know where test files go? (same directory as production, add .test suffix)
  → Constraint: test-coverage-contracts

□ Will I import logger from infra/telemetry/logger.ts (never console.log directly)?
  → Constraint: observability-discipline
```

### 3. Implementation Order Guidance
- **Provides:** 5-phase layer-by-layer implementation strategy
- **Includes:** Validation checkpoints after each phase
- **Prevents:** Bottom-up mistakes (e.g., domain with framework imports)
- **Always included:** Not constraint-specific

**Phases:**
1. Foundation (infra setup) → 0 violations expected
2. Domain (pure logic) → 0-2 violations expected
3. Infrastructure (adapters) → 0-5 violations expected
4. Application (services) → 0-8 violations expected
5. Presentation (UI/API) → <12 violations target

## Why This Matters

**v0.5.9 results:** Quick tips alone only reduced violations 10% (30 → 27)

**Root cause:** Tips were too generic - told "where" but not "how"

**v0.5.10 solution:** Progressive guidance funnel
- Tips: Set direction ("Tests mirror production structure")
- Examples: Show exact pattern ("apps/api/.../contact.ts → apps/api/.../contact.test.ts")
- Checklist: Verify understanding ("Do I know where test files go?")
- Order: Prevent mistakes (Build foundation first, then domain, then adapters...)

**Expected impact:** 55-74% violation reduction (27 → 7-12)

## Migration

No breaking changes. Improvements apply automatically:

```bash
# Upgrade CDA CLI
npm install

# Next cda run --plan includes new sections automatically
cda run --plan

# Or test directly
cda init
cda run --plan > prompt.txt
grep "PATTERN EXAMPLES" prompt.txt
grep "ARCHITECTURE CHECKLIST" prompt.txt
grep "RECOMMENDED IMPLEMENTATION ORDER" prompt.txt
```

## Technical Details

**New constraint fields (optional):**
- `quick_tip` (v0.5.9 - existing)
- `quick_example` (v0.5.10 - new)
- `checklist_item` (v0.5.10 - new)

**Prompt sections (in order):**
1. Instructions
2. Quick tips (if any)
3. Pattern examples (if any)
4. Architecture checklist (if any)
5. Implementation order (always)
6. Directive

**Token overhead:** ~3800 chars (~950 tokens, 10% increase)

**Compatibility:**
- Constraints without new fields work as before
- Legacy format (`--legacy-format`) skips all guidance sections
- Existing projects get improvements automatically

## Constraints Updated (v0.5.10)

8 constraints now include examples and checklist items:

1. **test-coverage-contracts** - Test file placement patterns
2. **observability-discipline** - Logger adapter setup and usage
3. **single-responsibility** - File splitting examples
4. **module-complexity-guardrails** - Module boundary examples
5. **structural-naming-consistency** - Feature folder structure
6. **shared-types-zod-source-of-truth** - Schema import paths
7. **central-config-entrypoint** - getConfig() usage
8. **clean-layer-direction** - Valid/invalid import examples

## Validation Results

Target: <12 violations on first `cda run --exec`

Test with same CRM scenario:
- Baseline (v0.5.9): 27 violations
- Expected (v0.5.10): 7-12 violations
- Reduction: 55-74%

## Future Enhancements

- Dynamic implementation order based on detected tech stack
- Interactive checklist mode (`cda run --checklist`)
- User-contributed examples via `cda contribute-example`
- Per-constraint tip quality metrics

## Feedback

Share results from your agent test runs:
- How many first-run violations?
- Which sections were most helpful?
- Which constraints need better examples?

File issues: https://github.com/JohanBellander/CdaCLI/issues
```

**Dependencies:** None  
**Estimated Time:** 15 minutes

---

**Phase 4 Checkpoint:**
- [ ] README.md updated with new prompt structure
- [ ] CHANGELOG.md has 0.5.10 entry
- [ ] SPECIFICATION_NEW.md documents new fields
- [ ] Release notes drafted
- [ ] Documentation accurate and complete

---

## Phase 5: Final Validation & Release (1 hour)

### Task 5.1: Full Build & Test Suite
**Commands:**
```bash
npm run build
npm test
```

**Validation checklist:**
- [ ] Build succeeds without errors
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] No TypeScript compilation errors
- [ ] No console warnings or deprecations

**Dependencies:** All previous phases  
**Estimated Time:** 5 minutes

---

### Task 5.2: Real Agent Test Run
**Scenario:** Same CRM test that produced 27 violations in v0.5.9

**Steps:**
```bash
# 1. Agent implements simple CRM following CDA.md
# 2. First execution with all changes
cda run --exec > results.txt

# 3. Count violations
grep "total_violations:" results.txt

# 4. Analyze violation breakdown
grep "Key Violations Found:" -A 20 results.txt
```

**Success criteria:**
- [ ] Total violations <12 (vs baseline 27)
- [ ] test-coverage-contracts: ≤3 (vs 9)
- [ ] observability-discipline: ≤2 (vs 7)
- [ ] single-responsibility: ≤2 (vs 4)

**If target not met:**
- Review agent transcript for evidence of reading guidance sections
- Identify which constraints still have high violations
- Consider strengthening examples for those constraints

**Dependencies:** Task 5.1  
**Estimated Time:** 30 minutes (includes agent run)

---

### Task 5.3: Performance Check
**Test:** Measure prompt generation overhead

```bash
# Baseline timing (v0.5.9)
time cda run --plan > /dev/null

# With v0.5.10 additions
time cda run --plan > /dev/null

# Difference should be <100ms
```

**Prompt size check:**
```bash
cda run --plan > prompt.txt
wc -c prompt.txt

# v0.5.9: ~40KB
# v0.5.10: ~44KB (10% increase)
# Acceptable for 55% violation reduction
```

**Dependencies:** Task 5.2  
**Estimated Time:** 10 minutes

---

### Task 5.4: Commit & Tag
**Commands:**
```bash
git add -A
git commit -m "feat: Add concrete examples, checklist & implementation order (v0.5.10)

Phase 1: Constraint Metadata
- Add quick_example field (multi-line concrete examples)
- Add checklist_item field (pre-implementation questions)
- Add examples to 8 priority constraints
- Add checklist items to same 8 constraints

Phase 2: Prompt Assembly
- Add buildPatternExamplesSection() function
- Add buildArchitectureChecklist() function
- Add buildImplementationOrderSection() function
- Integrate all sections into assemblePrompt()

Phase 3: Testing
- Unit tests for all new functions
- Integration tests for agent command
- Update snapshots
- Manual end-to-end validation

Phase 4: Documentation
- Update README.md prompt structure
- Update CHANGELOG.md for v0.5.10
- Update SPECIFICATION_NEW.md with new fields
- Create release notes

Target: Reduce first-run violations from 27 to <12 (55% reduction)

Progressive guidance funnel:
- Quick tips (v0.5.9): Set direction
- Examples (v0.5.10): Show patterns
- Checklist (v0.5.10): Verify understanding
- Order (v0.5.10): Prevent mistakes

Closes epic CDATool-XXX"

git tag v0.5.10
git push origin master --tags
```

**Dependencies:** Task 5.3  
**Estimated Time:** 5 minutes

---

**Phase 5 Checkpoint:**
- [ ] Build clean
- [ ] All tests pass
- [ ] Real agent test shows <12 violations
- [ ] Performance acceptable
- [ ] Changes committed and tagged
- [ ] Release published

---

## Rollback Plan

### Quick Rollback (Partial)
1. **Disable specific guidance sections** by returning empty strings from builder functions
2. **Remove examples from constraints** by editing frontmatter and rebuilding
3. **Users can disable problematic constraints** via `cda config`

### Full Rollback (Complete Revert)
1. Revert commits: `git revert v0.5.10`
2. Remove `quick_example` and `checklist_item` fields from types
3. Remove three builder functions
4. Remove examples and checklist items from constraint frontmatter
5. Rebuild and republish as v0.5.11

### Expected Issues & Mitigations

**Issue:** Examples are too verbose
- **Mitigation:** Edit `quick_example` text in constraint frontmatter, rebuild (no code change)

**Issue:** Checklist questions don't resonate with agents
- **Mitigation:** Reword `checklist_item` in frontmatter, rebuild

**Issue:** Implementation order doesn't fit all architectures
- **Mitigation:** Make it dynamic in v0.5.11 based on detected structure

**Issue:** Too much content overwhelms agents
- **Mitigation:** Track which sections agents read (via transcript analysis), remove least-used sections

---

## Success Criteria

### Must-Have (Release Blockers)
- [ ] All three new sections appear in prompt output
- [ ] Examples and checklist respect enabled/disabled constraints
- [ ] Implementation order always appears
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] No breaking changes to existing workflows
- [ ] Documentation complete

### Target Metrics (Post-Release)
- [ ] First-run violations <12 (vs baseline 27)
- [ ] test-coverage-contracts: ≤3 (was 9)
- [ ] observability-discipline: ≤2 (was 7)
- [ ] single-responsibility: ≤2 (was 4)
- [ ] Agent transcript shows architectural understanding earlier

### Nice-to-Have
- [ ] Violation reduction ≥60% (target 55%)
- [ ] Agent completes implementation in fewer iterations
- [ ] User feedback positive

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Examples become outdated | Medium | Low | Co-locate with constraints, review during updates |
| Too much content overwhelms | Medium | Medium | Progressive disclosure, visual markers, scannable format |
| Static order may not fit all projects | Medium | Low | Start static, gather feedback, make dynamic in v0.5.11 |
| Agents skip reading sections | Low | Medium | Visual markers, clear headers, place before directive |
| Performance degradation | Low | Low | Already tested, 10% overhead acceptable |
| Examples have typos/errors | Low | High | Peer review, test on real project |

**Overall Risk Level:** **Low** (additive feature, builds on proven v0.5.9 foundation)

---

## Timeline & Effort

| Phase | Duration | Dependencies | Start | End |
|-------|----------|--------------|-------|-----|
| Phase 1: Metadata | 2-3 hours | None | Day 1 AM | Day 1 AM |
| Phase 2: Assembly | 1-2 hours | Phase 1 | Day 1 PM | Day 1 PM |
| Phase 3: Testing | 2-3 hours | Phase 2 | Day 2 AM | Day 2 PM |
| Phase 4: Documentation | 1 hour | Phase 3 | Day 2 PM | Day 2 PM |
| Phase 5: Release | 1 hour | Phase 4 | Day 2 PM | Day 2 PM |

**Total: 7-10 hours over 2-3 days**

**Buffer:** Add 20% (1-2 hours) for unexpected issues

**Total with buffer: 8-12 hours**

---

## Appendix: File Checklist

### Files to Modify
- [ ] `src/core/types.ts` - Add quick_example, checklist_item to ConstraintMeta
- [ ] `src/core/promptAssembler.ts` - Add 3 builder functions, modify assemblePrompt
- [ ] `src/constraints/core/test-coverage-contracts.md`
- [ ] `src/constraints/core/observability-discipline.md`
- [ ] `src/constraints/core/single-responsibility.md`
- [ ] `src/constraints/core/module-complexity-guardrails.md`
- [ ] `src/constraints/core/structural-naming-consistency.md`
- [ ] `src/constraints/core/shared-types-zod-source-of-truth.md`
- [ ] `src/constraints/core/central-config-entrypoint.md`
- [ ] `src/constraints/core/clean-layer-direction.md`
- [ ] `tests/promptAssembler.test.ts` - Add unit tests for 3 functions
- [ ] `tests/agent/agentPrompt.test.ts` - Add integration tests
- [ ] `README.md` - Update prompt structure docs
- [ ] `CHANGELOG.md` - Add 0.5.10 entry
- [ ] `SPECIFICATION_NEW.md` - Document new fields

### Files to Create
- [ ] `docs/RELEASE_NOTES_0.5.10.md`

### Files to Review
- [ ] `tests/**/__snapshots__/*.snap` - Update as needed

---

## Comparison to IMPPLAN_FIRST.md

**IMPPLAN_FIRST.md (v0.5.9):**
- Added `quick_tip` field
- Simple tips section
- 10 constraints got tips
- 6-9 hours effort
- Result: 30 → 27 violations (10% reduction)

**IMPPLAN_SECOND.md (v0.5.10):**
- Adds `quick_example` and `checklist_item` fields
- Three new sections (examples, checklist, order)
- 8 constraints get examples + checklist items
- 7-10 hours effort
- Target: 27 → <12 violations (55% reduction)

**Key difference:** Multi-layered approach (tips + examples + checklist + order) vs single tip line

**Cumulative effect:** v0.5.9 + v0.5.10 = comprehensive guidance system
