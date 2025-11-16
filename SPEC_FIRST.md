# Specification: First-Run Quality Improvement via Dynamic Quick Tips

## 1. Overview

Add a `quick_tip` field to constraint metadata and dynamically generate a "Common Pitfalls" section in `cda run --plan` output. This section will only show tips for **enabled** constraints, making it adaptive to the project's configuration.

**Goal:** Reduce first-run violations from ~30 to <10 by surfacing critical patterns at decision time.

---

## 2. Problem Statement

Analysis of real agent test runs shows:
- Agents follow the mandatory workflow correctly
- Initial implementation produces 20-30 violations
- Most violations are "where does X go?" placement errors, not logic errors
- Common mistakes: Zod in domain, inline process.env, direct console.log, wrong test locations, non-canonical imports

**Root cause:** Agents don't internalize architectural patterns from the full `cda run --plan` output before coding.

---

## 3. Design Principles

### Must-Have
- ✅ **Modular:** Tips owned by individual constraints, not hardcoded in prompt assembler
- ✅ **Dynamic:** Only show tips for enabled constraints
- ✅ **Compact:** Each tip is one line, total section <20 lines
- ✅ **Non-breaking:** Works with existing constraint enable/disable system

### Nice-to-Have
- Minimal token overhead (estimate: 500-1000 chars added to prompt)
- Easy to maintain (tips live in constraint frontmatter)
- Backward compatible (tips are optional, constraints work without them)

---

## 4. Constraint Metadata Changes

### 4.1 Add `quick_tip` Field to Frontmatter

**Schema Addition:**
```typescript
// In src/core/types.ts
export interface ConstraintMeta {
  id: string;
  name: string;
  category: string;
  severity: 'error' | 'warning';
  enabled: boolean;
  optional: boolean;
  version: number;
  group: 'architecture' | 'patterns' | 'best-practices' | 'frameworks' | 'contracts';
  quick_tip?: string;  // NEW: Optional one-line tip for first-run guidance
}
```

**Frontmatter Example:**
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

### 4.2 Validation Rules

- `quick_tip` is **optional** (not required for constraint to load)
- If present, must be a non-empty string
- Recommended max length: 100 characters
- Should be actionable and specific (not just "follow the rules")
- Should answer "where" or "how" questions

### 4.3 Priority Constraints for Tips

Add `quick_tip` to these constraints (in priority order):

1. **domain-purity** - "Domain entities use plain TypeScript only—no Zod, ORM decorators, or framework imports"
2. **shared-types-zod-source-of-truth** - "All Zod schemas belong in packages/shared-types; import via @shared-types workspace alias"
3. **clean-layer-direction** - "Dependencies flow: UI → App → Domain ← Infra (infra implements domain ports, domain imports nothing)"
4. **central-config-entrypoint** - "Never use process.env directly; create single infra/config/index.ts exporting getConfig()"
5. **observability-discipline** - "No console.log in features; create infra/telemetry adapter for all logging"
6. **structural-naming-consistency** - "Feature folders must match across layers: domain/contacts/, app/contacts/, infra/contacts/"
7. **single-responsibility** - "Max 3 exports per file (5 for index.ts barrels or feature entry files)"
8. **test-coverage-contracts** - "Tests mirror production structure: src/domain/contact.ts → src/domain/contact.test.ts"
9. **api-boundary-hygiene** - "Create DTOs and mapper functions in infra layer; never expose domain entities directly"
10. **ports-and-adapters-integrity** - "Domain defines ports (interfaces), infra provides adapters (implementations)"

### 4.4 Loader Changes

**File:** `src/core/constraintLoader.ts`

**Change:** Parse `quick_tip` from frontmatter (already parsed, just need to include in type)

```typescript
// No code change needed if frontmatter parser is already flexible
// Just ensure quick_tip flows through to ConstraintMeta
```

---

## 5. Prompt Assembly Changes

### 5.1 Add Pitfalls Section Generator

**File:** `src/core/promptAssembler.ts`

**New Function:**
```typescript
/**
 * Generate a "Common Pitfalls" section from enabled constraints with quick_tip.
 * Only includes tips from constraints that are currently enabled.
 */
function buildQuickTipsSection(enabledConstraints: ConstraintDocument[]): string {
  const tips = enabledConstraints
    .filter(doc => doc.meta.quick_tip)
    .map(doc => `• ${doc.meta.quick_tip}`);
  
  if (tips.length === 0) {
    return ''; // No tips to show
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

### 5.2 Integration Point

**Where to inject:** In `assemblePrompt` function, after the instruction package but before the AGENT DIRECTIVE block.

**Current structure:**
```
1. Banner (AGENT VERIFICATION MODE)
2. Metadata block (run_id, timestamp, agent_name, etc.)
3. Optional prompt_preamble
4. Raw instruction package from cda run
5. AGENT DIRECTIVE block
6. Optional postscript
7. Metrics (char count, token estimate)
```

**New structure:**
```
1. Banner (AGENT VERIFICATION MODE)
2. Metadata block (run_id, timestamp, agent_name, etc.)
3. Optional prompt_preamble
4. Raw instruction package from cda run
5. *** Quick Tips Section (NEW) ***  <-- Insert here
6. AGENT DIRECTIVE block
7. Optional postscript
8. Metrics (char count, token estimate)
```

**Rationale:** 
- Tips appear after full instructions (agent has context)
- Tips appear before directive (reinforces key patterns before action)
- Tips are visually separated with markers (easy to scan)

### 5.3 Code Changes

**File:** `src/core/promptAssembler.ts`

**Function to modify:** `assemblePrompt`

**Change:**
```typescript
export function assemblePrompt(options: AssemblePromptOptions): PromptResult {
  // ... existing code ...
  
  const sections: string[] = [];
  sections.push(banner);
  sections.push(metadataBlock);
  if (preamble) sections.push(preamble);
  sections.push(instructionText);
  
  // NEW: Add quick tips section
  const quickTipsSection = buildQuickTipsSection(options.enabledConstraints);
  if (quickTipsSection) {
    sections.push(quickTipsSection);
  }
  
  sections.push(directiveBlock);
  if (postscript) sections.push(postscript);
  sections.push(metricsBlock);
  
  // ... rest of function ...
}
```

**Requirements:**
- `assemblePrompt` must receive `enabledConstraints: ConstraintDocument[]` in options
- Caller (in `src/cli/commands/agent.ts`) must pass enabled constraints
- Tips section is only added if at least one constraint has a `quick_tip`

---

## 6. Visual Format

### 6.1 Example Output

```text
===== BEGIN CDA INSTRUCTIONS (TO EXECUTE) =====
run_id: 2025-11-16T10:30:00.000Z-abc123
mode: batch

CONSTRAINT (INSTRUCTION ONLY): domain-purity
PURPOSE: Keep domain layer deterministic...
[... full instructions for 25 constraints ...]

===== END CDA INSTRUCTIONS =====

===== COMMON FIRST-RUN PITFALLS =====

Based on your active constraints, avoid these common mistakes:

• Domain entities use plain TypeScript only—no Zod, ORM decorators, or framework imports
• All Zod schemas belong in packages/shared-types; import via @shared-types workspace alias
• Dependencies flow: UI → App → Domain ← Infra (infra implements domain ports, domain imports nothing)
• Never use process.env directly; create single infra/config/index.ts exporting getConfig()
• No console.log in features; create infra/telemetry adapter for all logging
• Feature folders must match across layers: domain/contacts/, app/contacts/, infra/contacts/
• Max 3 exports per file (5 for index.ts barrels or feature entry files)
• Tests mirror production structure: src/domain/contact.ts → src/domain/contact.test.ts
• Create DTOs and mapper functions in infra layer; never expose domain entities directly
• Domain defines ports (interfaces), infra provides adapters (implementations)

===== END PITFALLS =====

===== AGENT DIRECTIVE =====
You are now in DETECTION-ONLY mode.
[... rest of directive ...]
```

### 6.2 When No Tips Available

If no enabled constraints have `quick_tip` defined:
- Section is **omitted entirely** (not "No tips available")
- Prompt flows directly from instructions to directive
- No change in behavior for legacy constraints

---

## 7. Implementation Plan

### Phase 1: Infrastructure (1-2 hours)
1. Add `quick_tip?: string` to `ConstraintMeta` type in `src/core/types.ts`
2. Verify constraint loader passes through `quick_tip` from frontmatter
3. Add `buildQuickTipsSection` function to `src/core/promptAssembler.ts`
4. Modify `assemblePrompt` to inject tips section
5. Update `AssemblePromptOptions` type to include `enabledConstraints`
6. Modify caller in `src/cli/commands/agent.ts` to pass enabled constraints

### Phase 2: Constraint Tips (2-3 hours)
1. Add `quick_tip` to 10 priority constraints (see section 4.3)
2. Review tips for clarity and length (<100 chars each)
3. Ensure tips are actionable and pattern-focused

### Phase 3: Testing (1-2 hours)
1. Unit test: `buildQuickTipsSection` with various inputs
2. Integration test: Verify tips appear in `cda run --plan` output
3. Integration test: Verify tips respect enabled/disabled constraints
4. Manual test: Run `cda run --plan` with different constraint configs
5. Snapshot test: Update existing prompt snapshots to include tips section

### Phase 4: Documentation (1 hour)
1. Update README.md to mention tips in prompt structure
2. Add changelog entry
3. Update SPECIFICATION_NEW.md to document `quick_tip` field

---

## 8. Testing Strategy

### 8.1 Unit Tests

**File:** `tests/promptAssembler.test.ts`

**New tests:**
```typescript
describe('buildQuickTipsSection', () => {
  it('returns empty string when no constraints have tips', () => {
    const constraints = [
      { meta: { id: 'test', quick_tip: undefined } }
    ];
    expect(buildQuickTipsSection(constraints)).toBe('');
  });
  
  it('generates section with tips from enabled constraints', () => {
    const constraints = [
      { meta: { id: 'c1', quick_tip: 'Tip 1' } },
      { meta: { id: 'c2', quick_tip: 'Tip 2' } }
    ];
    const result = buildQuickTipsSection(constraints);
    expect(result).toContain('COMMON FIRST-RUN PITFALLS');
    expect(result).toContain('• Tip 1');
    expect(result).toContain('• Tip 2');
  });
  
  it('filters out constraints without tips', () => {
    const constraints = [
      { meta: { id: 'c1', quick_tip: 'Tip 1' } },
      { meta: { id: 'c2', quick_tip: undefined } }
    ];
    const result = buildQuickTipsSection(constraints);
    expect(result).toContain('• Tip 1');
    expect(result).not.toContain('c2');
  });
});

describe('assemblePrompt with quick tips', () => {
  it('includes tips section when constraints have tips', () => {
    const result = assemblePrompt({
      instructionText: 'Test instructions',
      enabledConstraints: [
        { meta: { id: 'test', quick_tip: 'Test tip' } }
      ],
      // ... other options
    });
    expect(result.fullPrompt).toContain('COMMON FIRST-RUN PITFALLS');
    expect(result.fullPrompt).toContain('• Test tip');
  });
  
  it('omits tips section when no constraints have tips', () => {
    const result = assemblePrompt({
      instructionText: 'Test instructions',
      enabledConstraints: [
        { meta: { id: 'test', quick_tip: undefined } }
      ],
      // ... other options
    });
    expect(result.fullPrompt).not.toContain('COMMON FIRST-RUN PITFALLS');
  });
});
```

### 8.2 Integration Tests

**File:** `tests/agent/agentPrompt.test.ts`

**Tests:**
- Tips appear in `cda run --plan` output when constraints have tips
- Tips respect constraint enable/disable via `cda.config.json` overrides
- Disabled constraints' tips are excluded from output
- Tips section preserves correct order (after instructions, before directive)

### 8.3 Manual Testing

```bash
# Test 1: Tips appear with default config
cda run --plan > prompt.txt
grep -A 15 "COMMON FIRST-RUN PITFALLS" prompt.txt

# Test 2: Tips respect disabled constraints
cda config  # Disable domain-purity
cda run --plan > prompt2.txt
# Verify domain-purity tip is missing

# Test 3: No tips section when all constraints lack tips
# (Won't happen with our changes, but test with a clean constraint set)
```

---

## 9. Success Metrics

### Primary Goal
**First-run violations drop by 60%+**
- Baseline: ~30 violations on initial `cda run --exec`
- Target: <12 violations on initial `cda run --exec`

### Measurement Plan
1. Run same CRM test scenario with updated tool
2. Agent implements simple CRM following updated `CDA.md`
3. Count violations on first `cda run --exec`
4. Compare to baseline (30 violations from Nov 15 test)

### Expected Violation Reductions
- ✅ Zod in domain: 5-6 violations prevented
- ✅ Inline process.env: 1-3 violations prevented
- ✅ Console.log usage: 1-2 violations prevented
- ✅ Wrong mapper location: 2-3 violations prevented
- ✅ Test file placement: 3-5 violations prevented
- ✅ Non-canonical imports: 3-6 violations prevented
- ✅ Layer boundary errors: 2-4 violations prevented

**Total expected reduction: 17-29 violations prevented**

### Secondary Metrics
- Agent demonstrates architecture understanding earlier in transcript
- Fewer refactor cycles needed to reach zero violations
- Less time spent on "where does X go?" questions

---

## 10. Risks & Mitigations

### Risk 1: Tips are too generic
**Mitigation:** Each tip must answer a specific "where" or "how" question with concrete paths/patterns

### Risk 2: Token count bloat
**Mitigation:** 
- Limit tips to one line each (<100 chars)
- Only ~10 constraints get tips
- Total overhead: 500-1000 chars (acceptable)

### Risk 3: Tips become stale as constraints evolve
**Mitigation:**
- Tips live in constraint frontmatter (co-located with rules)
- Review tips during constraint updates
- Add lint/test to flag constraints with outdated tips

### Risk 4: Tips don't appear in all modes
**Mitigation:**
- Inject in `assemblePrompt`, which is used by both `--plan` and `--exec`
- Verify tips appear in all agent workflows

### Risk 5: Agents ignore tips
**Mitigation:**
- Place tips between instructions and directive (hard to miss)
- Use visual markers (`=====`) to draw attention
- Keep tips actionable and scannable (bullets)

---

## 11. Future Enhancements

### 11.1 Per-Constraint Tip Quality Metrics
Track which tips correlate with violation reduction:
- Log which tips were shown in prompt
- Correlate with violation types in report
- Iterate on tip wording for underperforming constraints

### 11.2 Context-Aware Tips
Tips could adapt based on:
- Tech stack detected (monorepo vs single app)
- Constraint combinations (domain-purity + shared-types → combined tip)
- Historical violation patterns for this repo

### 11.3 Interactive Tip Feedback
Allow users to:
- Rate tip usefulness via `cda feedback`
- Suggest better wording
- Contribute tips for custom constraints

### 11.4 Tip Categories
Group tips by concern:
- 🏗️ Structure tips (layers, folders)
- 📦 Dependencies tips (where to import from)
- 🧪 Testing tips (test structure)
- 🔧 Tooling tips (config, logging)

---

## 12. Backward Compatibility

### Constraints Without Tips
- Work exactly as before
- No errors or warnings
- Tips section simply omitted if no constraints have tips

### Existing Projects
- No breaking changes
- Old `CDA.md` files still valid
- Users regenerate with `cda onboard --overwrite` to get tips

### Legacy Format
- Tips are part of non-legacy prompt format only
- `--legacy-format` flag skips tips section entirely

---

## 13. Rollout Plan

### Version: 0.5.9

**Changes:**
- Add `quick_tip` to `ConstraintMeta` type
- Add `buildQuickTipsSection` to prompt assembler
- Add tips to 10 priority constraints
- Update tests and snapshots

**Announcement:**
- Changelog: "Improved first-run guidance with dynamic quick tips in agent prompts"
- README: Update prompt structure section to mention tips
- Release notes: "Agents now see common pitfalls based on enabled constraints"

**Migration:**
- Users regenerate `CDA.md`: `cda onboard --overwrite`
- No code changes required in user projects
- Tips appear automatically in next `cda run --plan`

---

## 14. Open Questions

1. Should tips be numbered or bulleted? (Recommendation: **bullets** for scannability)
2. Should tips section have its own sentinel markers? (Recommendation: **yes**, use `=====` for visual separation)
3. Should tips appear in `cda describe <id>` output? (Recommendation: **no**, keep describe focused on full protocol)
4. Should we allow multi-line tips? (Recommendation: **no**, enforce one-line to keep compact)
5. Should tips be part of the constraint validation? (Recommendation: **no**, tips are guidance not rules)

---

## 15. Appendix: Example Tips

### High-Quality Tips (Do This)
✅ "All Zod schemas belong in packages/shared-types; import via @shared-types workspace alias"  
✅ "Never use process.env directly; create single infra/config/index.ts exporting getConfig()"  
✅ "Tests mirror production structure: src/domain/contact.ts → src/domain/contact.test.ts"  

### Low-Quality Tips (Don't Do This)
❌ "Follow the domain purity rules" (too vague)  
❌ "Make sure your code is clean and organized" (not actionable)  
❌ "Read the full constraint documentation before coding" (defeats purpose)  

### Tip Writing Guidelines
- Start with action verb or location ("Create...", "All X go in...")
- Include concrete paths when relevant (`infra/config/index.ts`)
- Answer "where" or "how", not "why"
- One sentence maximum
- Avoid jargon unless constraint-specific
