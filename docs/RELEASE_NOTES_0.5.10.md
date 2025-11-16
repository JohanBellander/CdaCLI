# Release Notes - v0.5.10

## Overview
Release 0.5.10 builds on the v0.5.9 quick tips by delivering concrete pattern examples, an architecture self-checklist, and a recommended implementation order directly in every non-legacy prompt. The richer guidance targets a 55%+ reduction in first-run violations by showing both where artifacts live and how they should be wired before an agent writes code.

## Highlights
- **Constraint metadata upgrades** - Frontmatter now accepts `quick_example` (multi-line snippets) and `checklist_item` prompts alongside the existing `quick_tip`. Eight high-violation constraints were updated with curated content that mirrors the CRM reference architecture.
- **New prompt sections** - `assemblePrompt` (and every CLI entry point) now emits three additive sections when available: `PATTERN EXAMPLES`, `ARCHITECTURE CHECKLIST`, and an always-on `RECOMMENDED IMPLEMENTATION ORDER`. Legacy prompts still skip the entire guidance block.
- **Doc & schema updates** - README, SPECIFICATION_NEW.md, CHANGELOG, and the sample `cda.agents.json` were refreshed to describe the new fields, show example blocks, and bump Copilot arg-mode `max_length` to 60000 so the longer prompt fits comfortably.

## Impact
- Agents see concrete file-to-test mappings, logger adapter wiring, and layer-import rules without rereading every constraint, which reduces misplacements during the first execution.
- The checklist forces a mental confirmation step before coding, catching misunderstandings early and preventing cross-layer imports or missing tests.
- The recommended implementation order prevents bottom-up builds that often trigger cascading violations, aligning all runs to the same five-phase plan.

## Upgrade Guidance
1. Update to v0.5.10 (`npm install`) and rerun `npm run build` to copy the refreshed constraint metadata into `dist/`.
2. Ensure your `cda.agents.json` mirrors the new max-length budget (60000 for Copilot arg mode) if you scaffolded a custom config before this release.
3. Regenerate prompts via `cda run --plan` to verify the new sections appear and adjust any automation that parses prompt text.
4. Commit `.beads/issues.jsonl` alongside code changes per bd workflow so issue state stays synchronized with the new release.

