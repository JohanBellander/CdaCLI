# Implementation Plan: First-Run Quality via Dynamic Quick Tips

## Overview

Implement the dynamic quick tips feature as specified in `SPEC_FIRST.md` to reduce first-run violations from ~30 to <12 by surfacing critical architectural patterns in the `cda run --plan` output.

**Target Version:** 0.5.9  
**Estimated Effort:** 6-9 hours total  
**Risk Level:** Low (non-breaking, additive change)

---

## Phase 1: Type System & Infrastructure (1-2 hours)

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
  quick_tip?: string;  // ADD THIS LINE
}
```

**Validation:**
- TypeScript compiles without errors
- Existing constraint loading still works

**Dependencies:** None  
**Estimated Time:** 15 minutes

---

### Task 1.2: Verify Constraint Loader Handles Optional Fields
**File:** `src/core/constraintLoader.ts`

**Action:** Review frontmatter parser to ensure it passes through `quick_tip` field

**Expected behavior:**
- If `quick_tip` exists in frontmatter, include it in `ConstraintMeta`
- If `quick_tip` is missing, set to `undefined` (optional field)
- No validation errors for constraints without `quick_tip`

**Testing:**
```bash
# Create test constraint with quick_tip
echo '---
id: test-tip
quick_tip: "Test tip text"
---
PURPOSE
Test' > test-constraint.md

# Load and verify field is present
```

**Dependencies:** Task 1.1  
**Estimated Time:** 30 minutes

---

### Task 1.3: Add buildQuickTipsSection Function
**File:** `src/core/promptAssembler.ts`

**Implementation:**
```typescript
/**
 * Generate a "Common Pitfalls" section from enabled constraints with quick_tip.
 * Only includes tips from constraints that are currently enabled.
 * 
 * @param enabledConstraints - Array of constraint documents that are currently active
 * @returns Formatted tips section with visual markers, or empty string if no tips
 */
function buildQuickTipsSection(enabledConstraints: ConstraintDocument[]): string {
  const tips = enabledConstraints
    .filter(doc => doc.meta.quick_tip)
    .map(doc => `• ${doc.meta.quick_tip}`);
  
  if (tips.length === 0) {
    return '';
  }
  
  const lines: string[] = [];
  lines.push('');
  lines.push('===== COMMON FIRST-RUN PITFALLS =====');
  lines.push('');
  lines.push('Based on your active constraints, avoid these common mistakes:');
  lines.push('');
  lines.push(...tips);
  lines.push('');
  lines.push('===== END PITFALLS =====');
  lines.push('');
  
  return lines.join('\n');
}
```

**Export:** Add to module exports if needed

**Dependencies:** Task 1.1, 1.2  
**Estimated Time:** 30 minutes

---

### Task 1.4: Update AssemblePromptOptions Type
**File:** `src/core/promptAssembler.ts`

**Changes:**
```typescript
export interface AssemblePromptOptions {
  runId: string;
  agentName: string;
  agentModel?: string;
  instructionText: string;
  disabledConstraintIds: string[];
  enabledConstraints: ConstraintDocument[];  // ADD THIS LINE
  preamble?: string;
  postscript?: string;
  maxLength?: number;
}
```

**Dependencies:** Task 1.1  
**Estimated Time:** 10 minutes

---

### Task 1.5: Integrate Tips Section into assemblePrompt
**File:** `src/core/promptAssembler.ts`

**Function:** `assemblePrompt`

**Changes:**
```typescript
export function assemblePrompt(options: AssemblePromptOptions): PromptResult {
  const {
    runId,
    agentName,
    agentModel,
    instructionText,
    disabledConstraintIds,
    enabledConstraints,  // NEW
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
  
  // NEW: Add quick tips section between instructions and directive
  const quickTipsSection = buildQuickTipsSection(enabledConstraints);
  if (quickTipsSection) {
    sections.push(quickTipsSection);
  }
  
  sections.push(directiveBlock);
  if (postscript) {
    sections.push(postscript);
  }
  sections.push(metricsBlock);

  // ... rest of function unchanged ...
}
```

**Dependencies:** Task 1.3, 1.4  
**Estimated Time:** 20 minutes

---

### Task 1.6: Update Agent Command to Pass Enabled Constraints
**File:** `src/cli/commands/agent.ts`

**Function:** `runAgentCommand`

**Changes:**
```typescript
export async function runAgentCommand(
  argv: string[] = [],
  options: AgentCommandOptions = {},
): Promise<void> {
  // ... existing constraint loading ...
  
  const enabled = loadedConstraints.filter(doc => doc.meta.enabled);
  const disabled = loadedConstraints.filter(doc => !doc.meta.enabled);
  
  // ... existing instruction building ...
  
  const disabledConstraintIds = disabled.map((doc) => doc.meta.id);
  const promptResult = assemblePrompt({
    runId,
    agentName,
    agentModel: agentDefinition?.agentModel,
    instructionText,
    disabledConstraintIds,
    enabledConstraints: enabled,  // ADD THIS LINE
    preamble: agentDefinition?.promptPreamble,
    postscript: agentDefinition?.postscript,
    maxLength: agentDefinition?.maxLength,
  });
  
  // ... rest unchanged ...
}
```

**Dependencies:** Task 1.4, 1.5  
**Estimated Time:** 15 minutes

---

### Task 1.7: Update Run Command Integration
**File:** `src/cli/commands/run.ts`

**Action:** Verify `cda run --plan` uses same `assemblePrompt` path

**Expected:** No changes needed if run command delegates to agent command logic

**Dependencies:** Task 1.6  
**Estimated Time:** 15 minutes

---

**Phase 1 Checkpoint:**
- [ ] Types compile without errors
- [ ] `buildQuickTipsSection` function exists and handles edge cases
- [ ] `assemblePrompt` accepts and uses `enabledConstraints`
- [ ] Agent command passes enabled constraints to prompt assembler
- [ ] Manual test: `cda run --plan` executes without errors (no tips visible yet)

---

## Phase 2: Add Quick Tips to Constraints (2-3 hours)

### Task 2.1: Domain Purity
**File:** `src/constraints/core/domain-purity.md`

**Change:**
```yaml
---
id: domain-purity
name: Domain Purity Enforcement
category: domain
severity: error
enabled: true
optional: true
version: 1
group: architecture
quick_tip: "Domain entities use plain TypeScript only—no Zod, ORM decorators, or framework imports"
---
```

**Estimated Time:** 5 minutes

---

### Task 2.2: Shared Types Zod Source of Truth
**File:** `src/constraints/core/shared-types-zod-source-of-truth.md`

**Change:**
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
---
```

**Estimated Time:** 5 minutes

---

### Task 2.3: Clean Layer Direction
**File:** `src/constraints/core/clean-layer-direction.md`

**Change:**
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
---
```

**Estimated Time:** 5 minutes

---

### Task 2.4: Central Config Entrypoint
**File:** `src/constraints/core/central-config-entrypoint.md`

**Change:**
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
---
```

**Estimated Time:** 5 minutes

---

### Task 2.5: Observability Discipline
**File:** `src/constraints/core/observability-discipline.md`

**Change:**
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
---
```

**Estimated Time:** 5 minutes

---

### Task 2.6: Structural Naming Consistency
**File:** `src/constraints/core/structural-naming-consistency.md`

**Change:**
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
---
```

**Estimated Time:** 5 minutes

---

### Task 2.7: Single Responsibility
**File:** `src/constraints/core/single-responsibility.md`

**Change:**
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
---
```

**Estimated Time:** 5 minutes

---

### Task 2.8: Test Coverage Contracts
**File:** `src/constraints/core/test-coverage-contracts.md`

**Change:**
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
---
```

**Estimated Time:** 5 minutes

---

### Task 2.9: API Boundary Hygiene
**File:** `src/constraints/core/api-boundary-hygiene.md`

**Change:**
```yaml
---
id: api-boundary-hygiene
name: API Boundary Hygiene
category: contracts
severity: error
enabled: true
optional: true
version: 1
group: contracts
quick_tip: "Create DTOs and mapper functions in infra layer; never expose domain entities directly"
---
```

**Estimated Time:** 5 minutes

---

### Task 2.10: Ports and Adapters Integrity
**File:** `src/constraints/core/ports-and-adapters-integrity.md`

**Change:**
```yaml
---
id: ports-and-adapters-integrity
name: Ports and Adapters Integrity
category: architecture
severity: error
enabled: true
optional: true
version: 1
group: architecture
quick_tip: "Domain defines ports (interfaces), infra provides adapters (implementations)"
---
```

**Estimated Time:** 5 minutes

---

### Task 2.11: Build and Copy Constraints
**Command:**
```bash
npm run build
```

**Action:** Ensures updated constraint markdown files are copied to `dist/constraints/core/`

**Dependencies:** Tasks 2.1-2.10  
**Estimated Time:** 2 minutes

---

**Phase 2 Checkpoint:**
- [ ] All 10 constraints have `quick_tip` in frontmatter
- [ ] Tips are concise (<100 chars each)
- [ ] Tips are actionable and pattern-focused
- [ ] Build succeeds and copies constraints to dist/
- [ ] Manual test: Load constraints and verify `quick_tip` field is populated

---

## Phase 3: Testing (2-3 hours)

### Task 3.1: Unit Test - buildQuickTipsSection
**File:** `tests/promptAssembler.test.ts` (or create if missing)

**Tests to add:**
```typescript
import { buildQuickTipsSection } from '../src/core/promptAssembler';

describe('buildQuickTipsSection', () => {
  it('returns empty string when no constraints have tips', () => {
    const constraints = [
      { meta: { id: 'test1', quick_tip: undefined } },
      { meta: { id: 'test2', quick_tip: undefined } }
    ];
    const result = buildQuickTipsSection(constraints);
    expect(result).toBe('');
  });

  it('generates section with tips from constraints', () => {
    const constraints = [
      { meta: { id: 'c1', quick_tip: 'Tip one' } },
      { meta: { id: 'c2', quick_tip: 'Tip two' } }
    ];
    const result = buildQuickTipsSection(constraints);
    expect(result).toContain('COMMON FIRST-RUN PITFALLS');
    expect(result).toContain('• Tip one');
    expect(result).toContain('• Tip two');
    expect(result).toContain('END PITFALLS');
  });

  it('filters out constraints without tips', () => {
    const constraints = [
      { meta: { id: 'c1', quick_tip: 'Has tip' } },
      { meta: { id: 'c2', quick_tip: undefined } },
      { meta: { id: 'c3', quick_tip: 'Another tip' } }
    ];
    const result = buildQuickTipsSection(constraints);
    expect(result).toContain('• Has tip');
    expect(result).toContain('• Another tip');
    expect(result).not.toContain('c2');
  });

  it('includes proper formatting with visual markers', () => {
    const constraints = [
      { meta: { id: 'test', quick_tip: 'Test' } }
    ];
    const result = buildQuickTipsSection(constraints);
    expect(result).toMatch(/=====\s+COMMON FIRST-RUN PITFALLS\s+=====/);
    expect(result).toMatch(/=====\s+END PITFALLS\s+=====/);
  });
});
```

**Dependencies:** Phase 1 complete  
**Estimated Time:** 30 minutes

---

### Task 3.2: Unit Test - assemblePrompt with Tips
**File:** `tests/promptAssembler.test.ts`

**Tests to add:**
```typescript
describe('assemblePrompt with quick tips', () => {
  it('includes tips section when constraints have tips', () => {
    const result = assemblePrompt({
      runId: 'test-123',
      agentName: 'test-agent',
      instructionText: 'Test instructions',
      disabledConstraintIds: [],
      enabledConstraints: [
        { meta: { id: 'test', quick_tip: 'Test tip' }, content: '', sections: {} }
      ]
    });
    
    expect(result.fullPrompt).toContain('COMMON FIRST-RUN PITFALLS');
    expect(result.fullPrompt).toContain('• Test tip');
  });

  it('omits tips section when no constraints have tips', () => {
    const result = assemblePrompt({
      runId: 'test-123',
      agentName: 'test-agent',
      instructionText: 'Test instructions',
      disabledConstraintIds: [],
      enabledConstraints: [
        { meta: { id: 'test', quick_tip: undefined }, content: '', sections: {} }
      ]
    });
    
    expect(result.fullPrompt).not.toContain('COMMON FIRST-RUN PITFALLS');
  });

  it('places tips section between instructions and directive', () => {
    const result = assemblePrompt({
      runId: 'test-123',
      agentName: 'test-agent',
      instructionText: 'INSTRUCTIONS_MARKER',
      disabledConstraintIds: [],
      enabledConstraints: [
        { meta: { id: 'test', quick_tip: 'Tip' }, content: '', sections: {} }
      ]
    });
    
    const instructionsIdx = result.fullPrompt.indexOf('INSTRUCTIONS_MARKER');
    const tipsIdx = result.fullPrompt.indexOf('COMMON FIRST-RUN PITFALLS');
    const directiveIdx = result.fullPrompt.indexOf('AGENT DIRECTIVE');
    
    expect(tipsIdx).toBeGreaterThan(instructionsIdx);
    expect(directiveIdx).toBeGreaterThan(tipsIdx);
  });
});
```

**Dependencies:** Task 3.1  
**Estimated Time:** 30 minutes

---

### Task 3.3: Integration Test - Agent Command with Tips
**File:** `tests/agent/agentPrompt.test.ts` (or similar)

**Tests to add:**
```typescript
describe('agent prompt with quick tips', () => {
  it('includes tips from enabled constraints in plan mode', async () => {
    const cwd = await createTempDir();
    await setupTestProject(cwd, {
      constraints: ['domain-purity', 'shared-types-zod-source-of-truth']
    });
    
    const output = await captureOutput(() => 
      runAgentCommand(['--dry-run'], { cwd })
    );
    
    expect(output).toContain('COMMON FIRST-RUN PITFALLS');
    expect(output).toContain('Domain entities use plain TypeScript');
    expect(output).toContain('Zod schemas belong in packages/shared-types');
  });

  it('excludes tips from disabled constraints', async () => {
    const cwd = await createTempDir();
    await setupTestProject(cwd, {
      constraints: ['domain-purity'],
      disabledConstraints: ['shared-types-zod-source-of-truth']
    });
    
    const output = await captureOutput(() => 
      runAgentCommand(['--dry-run'], { cwd })
    );
    
    expect(output).toContain('Domain entities use plain TypeScript');
    expect(output).not.toContain('Zod schemas belong');
  });

  it('omits tips section when all constraints lack tips', async () => {
    const cwd = await createTempDir();
    // Use constraints without quick_tip
    await setupTestProject(cwd, {
      constraints: ['max-file-lines', 'excessive-nesting']
    });
    
    const output = await captureOutput(() => 
      runAgentCommand(['--dry-run'], { cwd })
    );
    
    expect(output).not.toContain('COMMON FIRST-RUN PITFALLS');
  });
});
```

**Dependencies:** Task 3.2, Phase 2 complete  
**Estimated Time:** 45 minutes

---

### Task 3.4: Integration Test - Run Command with Tips
**File:** `tests/cli/runCommand.integration.test.ts`

**Tests to add:**
```typescript
describe('cda run --plan with quick tips', () => {
  it('displays tips section in plan output', async () => {
    const cwd = await createTempDir();
    await setupDefaultProject(cwd);
    
    const output = await runCommand(['--plan'], { cwd });
    
    expect(output).toContain('COMMON FIRST-RUN PITFALLS');
    // Verify at least some tips appear
    expect(output).toMatch(/• .+ TypeScript/);
  });

  it('respects constraint overrides for tips', async () => {
    const cwd = await createTempDir();
    await setupProjectWithConfig(cwd, {
      constraint_overrides: {
        'domain-purity': { enabled: false }
      }
    });
    
    const output = await runCommand(['--plan'], { cwd });
    
    // Domain purity tip should not appear
    expect(output).not.toContain('Domain entities use plain TypeScript');
  });
});
```

**Dependencies:** Task 3.3  
**Estimated Time:** 30 minutes

---

### Task 3.5: Update Existing Snapshots
**Files:** `tests/**/__snapshots__/*.snap`

**Action:** Update snapshots that capture prompt output

**Commands:**
```bash
npm test -- --updateSnapshot
```

**Review:** Manually verify snapshot changes show tips section in expected location

**Dependencies:** Tasks 3.1-3.4  
**Estimated Time:** 20 minutes

---

### Task 3.6: Manual Testing - End to End
**Test Cases:**

1. **Default config with all tips:**
   ```bash
   cd /tmp/test-project
   cda init
   cda run --plan > prompt.txt
   grep -A 15 "COMMON FIRST-RUN PITFALLS" prompt.txt
   # Verify all 10 tips appear
   ```

2. **Selective constraint disable:**
   ```bash
   cda config  # Disable domain-purity
   cda run --plan > prompt2.txt
   # Verify domain-purity tip is absent
   ```

3. **Single constraint mode:**
   ```bash
   cda run --plan --constraint domain-purity > prompt3.txt
   # Verify only domain-purity tip appears (if in single mode)
   ```

4. **Legacy format:**
   ```bash
   cda run --plan --legacy-format > prompt4.txt
   # Verify tips section is omitted
   ```

**Dependencies:** Phase 2, Tasks 3.1-3.5  
**Estimated Time:** 30 minutes

---

**Phase 3 Checkpoint:**
- [ ] Unit tests for `buildQuickTipsSection` pass
- [ ] Unit tests for `assemblePrompt` with tips pass
- [ ] Integration tests for agent command pass
- [ ] Integration tests for run command pass
- [ ] Snapshots updated and reviewed
- [ ] Manual end-to-end tests pass
- [ ] Full test suite passes: `npm test`

---

## Phase 4: Documentation (1 hour)

### Task 4.1: Update README.md
**File:** `README.md`

**Section:** "Unified `cda run` Workflow" → "Prompt Structure"

**Addition:**
```markdown
### Prompt Structure
`cda run --plan` and `cda run --exec` both emit the same agent prompt:
1. Banner: `AGENT VERIFICATION MODE: PROMPT INTENDED FOR AUTOMATED EXECUTION`.
2. Metadata block: `run_id`, ISO timestamp, `instruction_format_version`, `agent_name`, optional `agent_model`, `token_estimate_method`.
3. Optional `prompt_preamble` from `cda.agents.json`.
4. Raw instruction package emitted by `cda run` (batch or single constraint) with AGENT ACTION REQUIRED / DO NOT blocks and the expanded report skeleton.
5. **Quick tips section** (NEW): Common pitfalls from enabled constraints with `quick_tip` field.
6. Directive block reminding the agent to execute detection/remediation steps verbatim.
7. Optional `postscript`.
8. Metrics: `original_char_count` and `approx_token_length` (chars ÷ 4 heuristic). CDA enforces any `max_length` in the agent definition.

The quick tips section only appears when at least one enabled constraint defines a `quick_tip` in its frontmatter. Tips are dynamic and adapt to your constraint configuration.
```

**Dependencies:** None  
**Estimated Time:** 15 minutes

---

### Task 4.2: Update CHANGELOG.md
**File:** `CHANGELOG.md`

**Version:** 0.5.9 (unreleased)

**Entry:**
```markdown
## [0.5.9] - 2025-11-16

### Added
- Dynamic quick tips in agent prompts (`cda run --plan` and `cda run --exec`)
  - Constraints can now define a `quick_tip` field in frontmatter
  - Tips section automatically generated based on enabled constraints
  - 10 priority constraints include first-run guidance (domain-purity, shared-types, clean-layer-direction, etc.)
  - Aims to reduce initial violations by surfacing common "where does X go?" patterns

### Changed
- `AssemblePromptOptions` now requires `enabledConstraints` parameter
- Prompt structure now includes tips section between instructions and directive
```

**Dependencies:** None  
**Estimated Time:** 10 minutes

---

### Task 4.3: Update SPECIFICATION_NEW.md
**File:** `SPECIFICATION_NEW.md`

**Section:** "5. Constraint Asset Model"

**Addition:**
```markdown
Each constraint markdown file contains:
- YAML frontmatter with metadata (`id`, `name`, `category`, `severity`, `enabled`, `optional`, `version`, `group`, **`quick_tip`**)
- Sectioned plain-text protocol (PURPOSE, SCOPE, DEFINITIONS, etc.)
- Optional report_fields for output formatting

The optional `quick_tip` field (added in 0.5.9) provides a one-line guidance string that appears in agent prompts when the constraint is enabled. Tips answer common "where does X go?" questions to reduce first-run violations.
```

**Section:** "9. Agent Prompt Directive (Non-Legacy)"

**Addition:**
```markdown
- After the instruction package and **before the directive block**, `assemblePrompt` may inject a "Common First-Run Pitfalls" section containing quick tips from enabled constraints. This section is omitted if no constraints define tips or if using legacy format.
```

**Dependencies:** None  
**Estimated Time:** 15 minutes

---

### Task 4.4: Create Release Notes Draft
**File:** `docs/RELEASE_NOTES_0.5.9.md` (or similar)

**Content:**
```markdown
# Release Notes: v0.5.9 - Dynamic Quick Tips

## Overview
This release adds dynamic quick tips to agent prompts, providing just-in-time architectural guidance to reduce first-run violations.

## Key Features

### Quick Tips in Agent Prompts
- Constraints can define a `quick_tip` in frontmatter for common first-run guidance
- Tips automatically appear in `cda run --plan` and `cda run --exec` prompts
- Only tips from **enabled** constraints are shown (respects `cda.config.json`)
- 10 priority constraints include tips for most common violation patterns

### Example Tips
- "Domain entities use plain TypeScript only—no Zod, ORM decorators, or framework imports"
- "All Zod schemas belong in packages/shared-types; import via @shared-types workspace alias"
- "Never use process.env directly; create single infra/config/index.ts exporting getConfig()"

### Benefits
- Reduced first-run violations (target: 60% reduction, from ~30 to <12)
- Faster agent convergence on architectural patterns
- Less time spent on "where does X go?" questions

## Migration
No breaking changes. To get updated prompts with tips:
1. Upgrade CDA CLI: `npm install` (in CDA repo or consuming project)
2. Regenerate onboarding guide: `cda onboard --overwrite`
3. Next `cda run --plan` will include tips automatically

## Implementation Details
- New optional `quick_tip` field in constraint frontmatter
- Tips section injected between instructions and directive in prompt
- Fully compatible with constraint enable/disable system
- Tips omitted in `--legacy-format` mode

## Constraints with Tips (v0.5.9)
1. domain-purity
2. shared-types-zod-source-of-truth
3. clean-layer-direction
4. central-config-entrypoint
5. observability-discipline
6. structural-naming-consistency
7. single-responsibility
8. test-coverage-contracts
9. api-boundary-hygiene
10. ports-and-adapters-integrity

More constraints may receive tips in future releases based on user feedback.
```

**Dependencies:** None  
**Estimated Time:** 20 minutes

---

**Phase 4 Checkpoint:**
- [ ] README.md updated with prompt structure changes
- [ ] CHANGELOG.md has 0.5.9 entry
- [ ] SPECIFICATION_NEW.md documents `quick_tip` field
- [ ] Release notes drafted
- [ ] Documentation builds without errors

---

## Phase 5: Final Validation & Release (30 minutes)

### Task 5.1: Full Build & Test Suite
**Commands:**
```bash
npm run build
npm test
```

**Validation:**
- [ ] Build succeeds without errors
- [ ] All tests pass (unit + integration)
- [ ] No console warnings or deprecations
- [ ] TypeScript compilation clean

**Dependencies:** All previous phases  
**Estimated Time:** 5 minutes

---

### Task 5.2: End-to-End Smoke Test
**Test Scenario:** Simulate agent workflow

```bash
# 1. Create fresh test project
mkdir /tmp/cda-test-059
cd /tmp/cda-test-059

# 2. Initialize with CDA
cda init

# 3. Generate plan and capture prompt
cda run --plan > plan.txt

# 4. Verify tips appear
grep "COMMON FIRST-RUN PITFALLS" plan.txt
grep "Domain entities" plan.txt
grep "Zod schemas" plan.txt

# 5. Disable a constraint and verify tip disappears
cda config  # Disable domain-purity interactively
cda run --plan > plan2.txt
! grep "Domain entities use plain TypeScript" plan2.txt  # Should not appear

# 6. Verify legacy format omits tips
cda run --plan --legacy-format > plan3.txt
! grep "COMMON FIRST-RUN PITFALLS" plan3.txt
```

**Dependencies:** Task 5.1  
**Estimated Time:** 15 minutes

---

### Task 5.3: Performance Check
**Test:** Measure prompt generation time with tips vs without

```bash
# Baseline (constraints without tips - simulate by temporarily removing tips)
time cda run --plan > /dev/null

# With tips
time cda run --plan > /dev/null

# Difference should be negligible (<50ms)
```

**Acceptance:** No measurable performance degradation

**Dependencies:** Task 5.2  
**Estimated Time:** 5 minutes

---

### Task 5.4: Commit & Tag
**Commands:**
```bash
git add -A
git commit -m "Add dynamic quick tips for first-run quality improvement

- Add optional quick_tip field to constraint metadata
- Implement buildQuickTipsSection in prompt assembler
- Inject tips between instructions and directive in agent prompts
- Add tips to 10 priority constraints (domain-purity, shared-types, etc.)
- Update tests, snapshots, and documentation
- Target: Reduce first-run violations from ~30 to <12

Closes #<issue-number>"

git tag v0.5.9
git push origin master --tags
```

**Dependencies:** Tasks 5.1-5.3  
**Estimated Time:** 5 minutes

---

**Phase 5 Checkpoint:**
- [ ] Build clean
- [ ] All tests pass
- [ ] Smoke test validates tips appear correctly
- [ ] Performance acceptable
- [ ] Changes committed and tagged

---

## Rollback Plan

If critical issues are discovered post-release:

### Quick Rollback (No Code Changes)
1. Constraint tips can be removed individually by editing constraint markdown and rebuilding
2. Users can disable problematic constraints via `cda config`
3. Tips section is skipped if no constraints have tips (graceful degradation)

### Full Rollback (Code Revert)
1. Revert commits: `git revert v0.5.9`
2. Remove `quick_tip` field from types
3. Remove `buildQuickTipsSection` function
4. Remove tips from constraint frontmatter
5. Rebuild and republish as v0.5.10

### Expected Issues & Mitigations

**Issue:** Tips are too verbose
- **Mitigation:** Edit tip text in constraint frontmatter, rebuild, no code change needed

**Issue:** Tips don't reduce violations as expected
- **Mitigation:** Gather metrics, iterate on tip wording, add more constraints with tips

**Issue:** Tips break legacy workflows
- **Mitigation:** Verify `--legacy-format` flag properly skips tips section

---

## Success Criteria

### Must-Have (Release Blockers)
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] `cda run --plan` shows tips section with valid config
- [ ] Tips respect enabled/disabled constraints
- [ ] No breaking changes to existing workflows
- [ ] Documentation updated

### Nice-to-Have (Post-Release)
- [ ] Measure violation reduction in real agent test run
- [ ] Collect user feedback on tip quality
- [ ] Add tips to additional constraints based on patterns

---

## Post-Release Activities

### Week 1: Monitor & Iterate
1. Run CRM test scenario with updated tool
2. Measure first-run violations (target: <12, baseline: 30)
3. Collect agent transcript data on tip effectiveness
4. Fix any reported bugs in patch release (0.5.10)

### Week 2-4: Expand & Refine
1. Add tips to 5 more constraints based on usage data
2. Refine tip wording based on user feedback
3. Consider tip categories or grouping for large constraint sets
4. Document best practices for writing effective tips

### Future Enhancements
- Context-aware tips (adapt based on detected tech stack)
- Tip effectiveness metrics (track violations per constraint)
- User-contributed tips via feedback mechanism
- Multi-line tips for complex patterns (if needed)

---

## Estimated Timeline

| Phase | Duration | Start | End |
|-------|----------|-------|-----|
| Phase 1: Infrastructure | 1-2 hours | Day 1 AM | Day 1 AM |
| Phase 2: Add Tips to Constraints | 2-3 hours | Day 1 PM | Day 1 PM |
| Phase 3: Testing | 2-3 hours | Day 2 AM | Day 2 PM |
| Phase 4: Documentation | 1 hour | Day 2 PM | Day 2 PM |
| Phase 5: Validation & Release | 30 min | Day 2 PM | Day 2 PM |

**Total: 6-9 hours over 2 days**

---

## Dependencies & Prerequisites

### Before Starting
- [ ] SPEC_FIRST.md reviewed and approved
- [ ] Test environment available (can create temp projects)
- [ ] No blocking issues in current release (0.5.8)
- [ ] Baseline metrics available (30 violations from test run)

### External Dependencies
- None (all changes are internal to CDA CLI)

### Team Coordination
- Communicate start of implementation (avoid conflicts)
- Reserve time for PR review if applicable
- Schedule release announcement

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Tips too verbose | Medium | Low | Keep tips <100 chars, iterate on wording |
| Tips don't reduce violations | Medium | Medium | Measure and iterate, add more tips |
| Performance degradation | Low | Low | Benchmark before/after, optimize if needed |
| Breaking changes | Low | High | Extensive testing, backward compat checks |
| Tips become stale | Medium | Low | Co-locate with constraints, review during updates |

**Overall Risk Level:** **Low** (additive feature, graceful degradation)

---

## Appendix: File Checklist

### Files to Modify
- [ ] `src/core/types.ts` (add `quick_tip` to ConstraintMeta)
- [ ] `src/core/promptAssembler.ts` (add buildQuickTipsSection, modify assemblePrompt)
- [ ] `src/cli/commands/agent.ts` (pass enabledConstraints)
- [ ] `src/constraints/core/domain-purity.md` (add quick_tip)
- [ ] `src/constraints/core/shared-types-zod-source-of-truth.md` (add quick_tip)
- [ ] `src/constraints/core/clean-layer-direction.md` (add quick_tip)
- [ ] `src/constraints/core/central-config-entrypoint.md` (add quick_tip)
- [ ] `src/constraints/core/observability-discipline.md` (add quick_tip)
- [ ] `src/constraints/core/structural-naming-consistency.md` (add quick_tip)
- [ ] `src/constraints/core/single-responsibility.md` (add quick_tip)
- [ ] `src/constraints/core/test-coverage-contracts.md` (add quick_tip)
- [ ] `src/constraints/core/api-boundary-hygiene.md` (add quick_tip)
- [ ] `src/constraints/core/ports-and-adapters-integrity.md` (add quick_tip)
- [ ] `tests/promptAssembler.test.ts` (add unit tests)
- [ ] `tests/agent/agentPrompt.test.ts` (add integration tests)
- [ ] `tests/cli/runCommand.integration.test.ts` (add integration tests)
- [ ] `README.md` (update prompt structure docs)
- [ ] `CHANGELOG.md` (add 0.5.9 entry)
- [ ] `SPECIFICATION_NEW.md` (document quick_tip field)

### Files to Create
- [ ] `docs/RELEASE_NOTES_0.5.9.md` (release notes)

### Files to Review (Snapshots)
- [ ] `tests/**/__snapshots__/*.snap` (update as needed)
