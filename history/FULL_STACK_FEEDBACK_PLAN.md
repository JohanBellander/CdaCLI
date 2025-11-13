# Full-Stack Constraint Feedback Plan

This playbook operationalizes Phase 5 of `IMPLEMENTATION_PLAN_FULL_STACK_CONSTRAINTS.md`. It explains how to capture adopter feedback, log issues via `bd`, and queue refinements for the ten new guardrails described in `FULL_STACK_CONSTRAINT_SPEC.md`.

## Objectives
- Detect false positives/negatives as soon as the new bundle lands in downstream repos.
- Tie every signal to a `bd` issue so heuristics changes always travel with code.
- Maintain clear ownership for follow-up work (scope documents, heuristics tweaks, doc refreshers).

## Intake Workflow
1. **Collect raw feedback** during validation runs (`cda run --plan/--exec`) or post-mortems. Ask for:
   - Constraint id
   - Example file(s) and repro steps
   - Whether the issue is a false positive, false negative, or scope gap
2. **Open a bead** referencing the parent epic and discovery source:
   ```bash
   bd create "ui-isolation flags storybook mocks" \
     -t bug \
     -p 1 \
     --deps discovered-from:CDATool-shg \
     --json
   ```
   Add `blocked-by:<id>` or `relates-to:<id>` when dependencies surface.
3. **Tag severity** (`priority 0/1` for blocking false positives, `2/3` for scope enhancements).
4. **Attach artifacts** (prompt excerpts, `cda list` output, repo snippet) so the remediation agent can replay conditions.
5. **Review weekly** during triage; move ready items into implementation issues or close as invalid if the constraint behaved correctly.

## Feedback Matrix

| Constraint ID                   | Signals to Watch                                                                 | Typical Follow-Up                                                                 |
|---------------------------------|-----------------------------------------------------------------------------------|------------------------------------------------------------------------------------|
| `clean-layer-direction`         | Layer detectors misclassifying shared libs, repeated cycle reports               | Expand path classifiers, allow opt-in shared directories via override metadata    |
| `domain-purity`                 | Legitimate uses of Date/random flagged, port imports misread                     | Document dependency injection patterns, consider allowlists for utility wrappers  |
| `ports-and-adapters-integrity`  | Adapters without explicit `implements` but structurally compliant                | Support doc-comment tagging (e.g., `@implements`) or relaxed detection for tests  |
| `central-config-entrypoint`     | Framework-specific env loaders (Next.js, Remix) causing noise                    | Add framework shims to the approved entrypoint list                               |
| `structural-naming-consistency` | Legacy pluralization or nested feature folders                                   | Allow per-layer exemptions or auto-normalize via config                           |
| `module-complexity-guardrails`  | Generated code, barrels, or schema exports exceeding thresholds                  | Add metadata to skip generated directories; expose per-layer threshold overrides  |
| `ui-isolation`                  | Storybook stories and test fixtures importing services intentionally             | Ignore `*.stories.*` and `__fixtures__` folders by default                         |
| `api-boundary-hygiene`          | Controllers returning domain events for streaming APIs                           | Provide documented exception path + adapter-injection recipe                      |
| `observability-discipline`      | Third-party SDKs that must emit their own logs                                   | Wrap SDK output via adapters or allow pass-through per dependency allowlist       |
| `test-coverage-contracts`       | Polyglot repos whose tests live outside `tests/**`                               | Support custom mirrors via config, or auto-detect alternative test roots          |

Update the matrix as new patterns appear; link rows to specific bead IDs for traceability.

## Scheduling Refinements
- **Weekly triage:** close duplicate beads, merge overlapping requests, and confirm reproduction steps.
- **Monthly planning:** move aggregated fixes into milestones (e.g., `CDATool-shg.11` for cross-cutting enhancements).
- **Documentation refresh:** whenever heuristics change, update README, `CDA.md` scaffolding, and the relevant constraint markdown before closing the bead.
- **Metrics:** track the ratio of violations vs. confirmed issues per constraint to spot noisy heuristics quickly. Capture summaries in `CHANGELOG.md` when notable fixes ship.

## Communication Template

```
Subject: Full-Stack Constraint Feedback – <constraint_id>

- Repo / revision:
- Constraint outcome (pass/fail):
- Expected behavior:
- Actual behavior:
- Files / artifacts:
- Proposed remediation or follow-up:

Logged as: bd create "..."; discovered-from:CDATool-shg.<child-id>
```

Share the template with adopter teams so intake stays consistent. A clean audit trail shortens the turnaround time for future heuristics improvements.
