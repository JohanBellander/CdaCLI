# Release Notes – v0.5.9

## Overview
Release 0.5.9 introduces dynamic quick tips that surface the most common architectural pitfalls directly inside the `cda run --plan/--exec` prompt. The goal is to cut first-run violations from ~30 to fewer than 12 by reminding agents where specific artifacts belong before they start coding.

## Highlights
- **Dynamic quick tips section** – Each constraint can now declare an optional `quick_tip` frontmatter line. Enabled constraints contribute bullet points to a `===== COMMON FIRST-RUN PITFALLS =====` block that is injected between the instruction package and the directive block.
- **Prompt pipeline updates** – `assemblePrompt`, the CLI agent command, and Vitest coverage were extended so the tips section only appears for non-legacy prompts and precisely mirrors the currently active constraints.
- **Curated guidance for core rules** – Ten high-priority core constraints now ship with concise, <100 character reminders (Zod schema placement, process.env usage, layer direction, etc.) so teams benefit immediately without authoring their own tips.

## Impact
- Targets a 60% reduction in first-run violations by giving agents direct answers to the recurring “where does X go?” questions (30 issues → <12 issues).
- Respects existing configuration: tips are generated only for constraints that remain enabled after `constraint_overrides`, so custom bundles stay noise-free.
- Adds zero maintenance overhead: updating a constraint’s `quick_tip` automatically updates both documentation and prompt output.

## Upgrade Guidance
- Regenerate onboarding artifacts (`cda onboard --overwrite`) if you want the latest documentation references.
- Ensure your agent configuration stays on non-legacy prompts to receive the new section; legacy format intentionally omits the quick tips block for backward compatibility.
