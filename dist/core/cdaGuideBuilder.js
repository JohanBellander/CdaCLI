// Beads: CDATool-m8x
import { CONSTRAINT_SECTION_ORDER, } from "./constraintLoader.js";
import { WORKFLOW_CHECKLIST } from "./workflow.js";
const CORE_PRINCIPLES = [
    "You MUST maintain deterministic execution: identical inputs MUST yield identical instruction packages and reports.",
    "You MUST uphold purity where constraints demand it (domain services stay side-effect free).",
    "You MUST respect layer boundaries (domain ↔ app ↔ infra).",
    "You MUST centralize persistence and configuration boundaries.",
    "You MUST apply canonical naming and logging conventions.",
    "You MUST NOT fabricate data or skip detection steps.",
    "You MUST keep implementation and validation phases separate.",
    "You MUST pursue minimal, surgical changes before expansive refactors.",
];
const SAFETY_SWITCHES = [
    "You MUST run `cda agent --dry-run` (batch mode) before writing code to capture the authoritative verification prompt.",
    "You SHOULD run `cda agent --dry-run` before executing an external agent to confirm the prompt contents.",
    "You MAY use `cda agent --no-exec` when you only need the prompt text (for off-line review).",
    "You MUST only run `cda agent` without `--dry-run` when you trust the configured external CLI.",
];
const CHECKLIST_ITEMS = [
    "You MUST read the High-Level Purpose block before modifying any files.",
    "You MUST list every planned edit alongside the constraint(s) it satisfies.",
    "You MUST run `cda agent --dry-run` (batch) to obtain the latest verification prompt and archive it with the run_id.",
    "You MUST execute each detection step exactly as written for every constraint block.",
    "You MUST record initial violations before attempting any remediation.",
    "You MUST apply remediation steps in the given FIX SEQUENCE order.",
    "You MUST rerun detection after each remediation cycle (up to two attempts).",
    "You MUST assemble the EXPECTED AGENT REPORT FORMAT with exact keys and ordering.",
    "You MUST set `execution_state` to `validated` only when all success_conditions become true; otherwise set `failed`.",
    "You MUST persist the final report and beads references before declaring the run complete.",
];
const SECTION_SEQUENCE = CONSTRAINT_SECTION_ORDER.filter((section) => section !== "HEADER");
export function buildCdaGuide(constraints) {
    const active = constraints.filter((doc) => doc.meta.isActive);
    const ordered = [...active].sort((a, b) => {
        if (a.meta.enforcementOrder === b.meta.enforcementOrder) {
            return a.meta.id.localeCompare(b.meta.id);
        }
        return a.meta.enforcementOrder - b.meta.enforcementOrder;
    });
    const lines = [];
    lines.push("# CDA Agent Playbook (Second-Person Authoritative Guide)");
    lines.push("");
    lines.push("You are required to implement and validate code according to CDA architectural constraints. You MUST NOT assume current compliance; all example statuses are placeholders until you complete the full validation loop.");
    lines.push("");
    addHighLevelPurpose(lines);
    addCorePrinciples(lines);
    addConstraintSummaryTable(lines, ordered);
    if (ordered.some((constraint) => constraint.meta.optional)) {
        addOptionalConstraintGuidance(lines);
    }
    addPerConstraintGuidance(lines, ordered);
    addCommandUsageSection(lines);
    addDetectionRemediationSection(lines);
    addReportingTemplateSnapshot(lines);
    addOutcomeActions(lines);
    addEscalationSection(lines);
    addTokenManagementSection(lines);
    addNonInterpretationSection(lines);
    addForbiddenShortcuts(lines);
    addVersionLinkageSection(lines);
    addChecklist(lines);
    addFutureEnhancements(lines);
    addFinalReminder(lines);
    return lines.join("\n").trimEnd() + "\n";
}
function addHighLevelPurpose(lines) {
    lines.push("## 1. High-Level Purpose");
    lines.push("");
    lines.push("You MUST treat this document as your authoritative playbook. It tells you how to plan implementation, how to execute verification, and how to report results. You MUST read each section before declaring any architectural compliance.");
    lines.push("You MUST use `cda agent --dry-run` to generate the verification prompt because it appends the metadata banner, directive block, and token metrics required by Spec Update 2. Use `cda agent --constraint <id>` when you need a focused prompt, and fall back to `cda agent --dry-run --legacy-format` only when a downstream model cannot ingest the enriched structure.");
    lines.push("");
}
function addCorePrinciples(lines) {
    lines.push("## 2. Core Principles");
    lines.push("");
    CORE_PRINCIPLES.forEach((principle) => lines.push(`- ${principle}`));
    lines.push("");
}
function addConstraintSummaryTable(lines, ordered) {
    lines.push("## 3. Constraint Summary Table");
    lines.push("");
    lines.push("| Order | Constraint ID | Name | Intent |");
    lines.push("|-------|---------------|------|--------|");
    for (const constraint of ordered) {
        const nameCell = constraint.meta.optional
            ? `${constraint.meta.name} (Optional)`
            : constraint.meta.name;
        lines.push(`| ${constraint.meta.enforcementOrder} | \`${constraint.meta.id}\` | ${nameCell} | ${sanitize(constraint.sections.PURPOSE)} |`);
    }
    lines.push("");
}
function addPerConstraintGuidance(lines, ordered) {
    lines.push("## 4. Per-Constraint Implementation Guidance");
    lines.push("");
    for (const constraint of ordered) {
        const headingName = constraint.meta.optional
            ? `${constraint.meta.name} (Optional)`
            : constraint.meta.name;
        lines.push(`### ${headingName} (\`${constraint.meta.id}\`, order ${constraint.meta.enforcementOrder})`);
        lines.push("");
        lines.push(`You MUST enforce the following intent: ${sanitize(constraint.sections.PURPOSE)}`);
        lines.push("");
        lines.push("You MUST perform the documented detection steps:");
        lines.push("```");
        lines.push(constraint.sections["VALIDATION ALGORITHM (PSEUDOCODE)"]);
        lines.push("```");
        lines.push("");
        lines.push("You MUST allow only the following patterns and exceptions:");
        lines.push(constraint.sections.ALLOWED);
        lines.push("");
        lines.push("You MUST NOT introduce the following anti-patterns:");
        lines.push(constraint.sections.FORBIDDEN);
        lines.push("");
        lines.push("You MUST follow this remediation sequence without reordering steps:");
        lines.push(constraint.sections["FIX SEQUENCE (STRICT)"]);
        lines.push("");
        lines.push("You MUST confirm these assertions before declaring success for this constraint:");
        lines.push(constraint.sections["POST-FIX ASSERTIONS"]);
        lines.push("");
    }
}
function addOptionalConstraintGuidance(lines) {
    lines.push("## Optional Constraint Toggles");
    lines.push("");
    lines.push("Constraints labeled `(Optional)` may be disabled by editing the `constraint_overrides` object in `cda.config.json`. Mandatory constraints (no `(Optional)` tag) cannot be disabled.");
    lines.push("Example: set `\"<constraint_id>\": { \"enabled\": false }` to disable an optional constraint, or `true` to force-enable bundles that ship disabled. See SPECIFICATION_OPTIONAL.md for details.");
    lines.push("");
}
function addCommandUsageSection(lines) {
    lines.push("## 5. Command Usage Sequencing");
    lines.push("");
    lines.push("### Implementation Phase");
    lines.push("1. You MUST run `cda agent --dry-run` (batch) before editing code to capture the current verification prompt; archive the output so you can prove which directives were in force.");
    lines.push("2. You MUST map every planned file change to at least one active constraint.");
    lines.push("3. You SHOULD re-run `cda agent --dry-run` (optionally with `--output <file>`) after editing files to confirm the prompt reflects the updated codebase before executing the external agent.");
    lines.push("");
    lines.push("### Validation Phase");
    lines.push("1. You MUST use `cda agent` to assemble the verification prompt and send it to the configured agent.");
    lines.push("2. You MUST use `--constraint <id>` (or `--sequential` to walk the recommended order) whenever you need a single-constraint prompt; otherwise default to batch mode.");
    lines.push("3. You MUST store the generated agent report alongside the run_id for traceability.");
    lines.push("4. You MAY supply `--legacy-format` only when the downstream tool cannot handle the agent metadata additions, and you MUST document that exception in your report.");
    lines.push("");
    lines.push("### Batch Workflow");
    WORKFLOW_CHECKLIST.forEach((item) => lines.push(`- ${item}`));
    lines.push("");
    lines.push("### Safety Switches");
    SAFETY_SWITCHES.forEach((item) => lines.push(`- ${item}`));
    lines.push("");
}
function addDetectionRemediationSection(lines) {
    lines.push("## 6. Detection & Remediation Protocol");
    lines.push("");
    lines.push("Detection Steps:");
    lines.push("1. You MUST establish the full file scope (no skipped directories).");
    lines.push("2. You MUST perform static analysis pattern matching per constraint.");
    lines.push("3. You MUST record every violation with the schema required by the constraint before touching code.");
    lines.push("");
    lines.push("Remediation Attempts:");
    lines.push("- You MUST limit remediation to two attempts per violation.");
    lines.push("- You MUST rerun the complete detection algorithm after each attempt.");
    lines.push("- You MUST preserve evidence of every attempt (fixes_applied).");
    lines.push("");
}
function addReportingTemplateSnapshot(lines) {
    lines.push("## 7. Reporting Template Snapshot");
    lines.push("");
    lines.push("You MUST produce the following structure after executing the verification loop:");
    lines.push("```");
    lines.push("report_kind: cda_validation_result");
    lines.push("run_id: <value>");
    lines.push("instruction_format_version: <value>");
    lines.push("agent_name: <value>");
    lines.push("agent_model: <value or null>");
    lines.push("token_estimate_method: heuristic_chars_div_4");
    lines.push("execution_state: unvalidated|validated|failed");
    lines.push("analysis_performed: false");
    lines.push("constraint_blocks_received: <int>");
    lines.push("summary:");
    lines.push("  analyzed_files: <int>");
    lines.push("  constraints_evaluated: <int>");
    lines.push("  total_violations: <int>");
    lines.push("violations: []");
    lines.push("fixes_applied: []");
    lines.push("initial_violation_count: <int>");
    lines.push("remaining_violation_count: <int>");
    lines.push("post_fix_status:");
    lines.push("  revalidated: <bool>");
    lines.push("  remaining_violations: <int>");
    lines.push("revalidation_attempts_used: <int>");
    lines.push("success_conditions:");
    lines.push("  all_constraints_evaluated: <bool>");
    lines.push("  no_remaining_violations: <bool>");
    lines.push("self_audit:");
    lines.push("  all_constraints_present: <bool>");
    lines.push("  all_required_fields_populated: <bool>");
    lines.push("  revalidation_attempts_documented: <bool>");
    lines.push("  schema_conformance: <bool>");
    lines.push("agent_execution_signature: executed-detection-and-remediation|null");
    lines.push("completion_timestamp: <ISO8601|null>");
    lines.push("status: validated|failed|null");
    lines.push("```");
    lines.push("");
}
function addOutcomeActions(lines) {
    lines.push("## 8. Outcome Actions");
    lines.push("");
    lines.push("| Outcome | Requirements | Follow-Up |");
    lines.push("|---------|--------------|-----------|");
    lines.push("| SUCCESS | You MUST evaluate every constraint and reach zero remaining violations. | You MAY proceed to merge or handoff after attaching the final report. |");
    lines.push("| PARTIAL | You MUST document the remaining violations explicitly (remaining_violation_count > 0). | You MUST create beads referencing unresolved constraints before re-running. |");
    lines.push("| INCOMPLETE | You did not evaluate all constraints. | You MUST rerun the full sequence before any sign-off; escalate if blocked. |");
    lines.push("");
}
function addEscalationSection(lines) {
    lines.push("## 9. Escalation & Beads Integration");
    lines.push("");
    lines.push("You MUST create beads for unresolved constraints using the title pattern `Constraint <id> remaining violations after run <run_id>`.");
    lines.push("You MUST link those beads back to the originating run via `discovered-from:<run_id>` whenever the tracker supports dependencies.");
    lines.push("");
}
function addTokenManagementSection(lines) {
    lines.push("## 10. Token / Complexity Management");
    lines.push("");
    lines.push("You MUST monitor `approx_token_length`. If it exceeds an agent's `max_length`, you MUST split the work by constraint criticality while preserving the same run_id lineage.");
    lines.push("You MUST document any splits inside the agent report and beads so reviewers can trace the full execution.");
    lines.push("");
}
function addNonInterpretationSection(lines) {
    lines.push("## 11. Non-Interpretation Principle");
    lines.push("");
    lines.push("You MUST treat every placeholder value (e.g., summary counts, success flags) as unverified until you execute the entire detection-remediation loop. You MUST NOT claim compliance based on template defaults.");
    lines.push("");
}
function addForbiddenShortcuts(lines) {
    lines.push("## 12. Forbidden Shortcuts");
    lines.push("");
    lines.push("- You MUST NOT skip detection steps, even when code seems trivial.");
    lines.push("- You MUST NOT declare success after a partial remediation cycle.");
    lines.push("- You MUST NOT fabricate fixes_applied entries.");
    lines.push("- You MUST NOT delete violations without changing code.");
    lines.push("");
}
function addVersionLinkageSection(lines) {
    lines.push("## 13. Version Linkage");
    lines.push("");
    lines.push("You MUST re-run `cda agent --dry-run` whenever the `instruction_format_version` printed in the prompt differs from the version recorded in your previous report.");
    lines.push("");
}
function addChecklist(lines) {
    lines.push("## 14. Validation Checklist");
    lines.push("");
    CHECKLIST_ITEMS.forEach((item, index) => lines.push(`${index + 1}. ${item}`));
    lines.push("");
}
function addFutureEnhancements(lines) {
    lines.push("## 15. Future Enhancements (Informative)");
    lines.push("");
    lines.push("Future releases MAY introduce automatic prompt compliance checks, arg/file injection modes for agents, and structured output parsing. These notes are informative only; they do NOT relax any current MUST statements.");
    lines.push("");
}
function addFinalReminder(lines) {
    lines.push("## 16. Final Mandatory Reminder");
    lines.push("");
    lines.push("All instructions herein are mandatory for you unless explicitly marked Informative. Failure to follow any MUST invalidates your validation report.");
    lines.push("");
}
function sanitize(value) {
    return value.replace(/\s+/g, " ").trim();
}
