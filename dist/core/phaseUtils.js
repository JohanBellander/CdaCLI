import { createError } from "./errors.js";
import { PHASES, PHASE_CONSTRAINTS, } from "./types.js";
const PHASE_TITLES = {
    foundation: "Foundation Layer",
    domain: "Domain Layer",
    infrastructure: "Infrastructure Layer",
    application: "Application Layer",
    presentation: "Presentation Layer",
};
const PHASE_SUMMARIES = {
    foundation: "Config, logging, folder structure in place",
    domain: "Pure business logic layer",
    infrastructure: "Database and HTTP adapters",
    application: "Use cases and orchestration",
    presentation: "HTTP routes and React UI",
};
const PHASE_OBJECTIVES = {
    foundation: [
        "Stand up centralized configuration, logging, and observability before touching product code.",
        "Lock folder/file naming conventions and directory depth guardrails to avoid future refactors.",
    ],
    domain: [
        "Implement pure business logic with value objects, aggregates, and services that have zero side effects.",
        "Model every shared contract with Zod schemas and reuse inferred types across the codebase.",
    ],
    infrastructure: [
        "Connect the domain to databases, APIs, and external systems through clean ports and adapters.",
        "Keep Prisma repositories, HTTP clients, and file adapters isolated from the domain layer.",
    ],
    application: [
        "Orchestrate domain behaviors through use cases that depend on ports rather than concrete adapters.",
        "Enforce MVC/MVP/MVVM boundaries and add regression tests that prove business flows end-to-end.",
    ],
    presentation: [
        "Expose APIs and UI with Fastify, Next.js, and React only after inner layers are validated.",
        "Keep controllers and components thin while delegating async state to TanStack Query.",
    ],
};
const PHASE_KEY_PRINCIPLES = {
    foundation: [
        "Provide a single configuration entrypoint exporting typed runtime settings.",
        "Establish a logger/observability utility usable by every layer.",
        "Enforce kebab-case naming, max 500 LOC per file, and shallow directory nesting.",
        "Create src/domain, src/application, src/infrastructure, and src/presentation folders even if empty.",
    ],
    domain: [
        "Domain modules export pure functions—no fs, HTTP, DB, or framework imports.",
        "Never import from application, infrastructure, or presentation layers.",
        "Shared contracts originate from Zod schemas (use z.infer for TypeScript types).",
        "Keep each module focused on one responsibility with low cyclomatic complexity.",
    ],
    infrastructure: [
        "Adapters implement the port interfaces defined in the domain layer.",
        "Repositories use Prisma (or equivalent) with data mappers per aggregate.",
        "HTTP clients wrap Axios in reusable services instead of scattering requests.",
        "Do not leak infrastructure dependencies back into the domain.",
    ],
    application: [
        "Use cases coordinate domain entities strictly through ports.",
        "Controllers/presenters stay thin—respect MVC/MVP/MVVM boundaries.",
        "Never import infrastructure code directly; depend on domain contracts.",
        "Maintain >80% coverage with tests that exercise behavior contracts.",
    ],
    presentation: [
        "Fastify controllers map HTTP routes to application use cases.",
        "Next.js App Router follows the required directory conventions.",
        "React components remain pure UI; no direct data fetching side effects.",
        "Use TanStack Query for async data and caching instead of manual Axios calls.",
    ],
};
export function assertValidPhase(phaseName) {
    const normalized = phaseName.trim().toLowerCase();
    if (PHASES.includes(normalized)) {
        return normalized;
    }
    throw createError("CONFIG_ERROR", `Unknown phase '${phaseName}'. Valid options: ${PHASES.join(", ")}.`);
}
export function getPhaseIndex(phase) {
    const index = PHASES.indexOf(phase);
    if (index === -1) {
        throw createError("CONFIG_ERROR", `Unknown phase '${phase}'. Valid options: ${PHASES.join(", ")}.`);
    }
    return index;
}
export function getPhaseConstraintIds(phase) {
    const index = getPhaseIndex(phase);
    const includedPhases = PHASES.slice(0, index + 1);
    const ids = includedPhases.flatMap((phaseName) => PHASE_CONSTRAINTS[phaseName] ?? []);
    return Array.from(new Set(ids));
}
export function getConstraintsForPhase(phase, allConstraints) {
    const ids = new Set(getPhaseConstraintIds(phase));
    return allConstraints.filter((constraint) => constraint.isActive && ids.has(constraint.id));
}
export function filterConstraintsByPhase(input) {
    const phaseIndex = getPhaseIndex(input.phase);
    const includedPhases = PHASES.slice(0, phaseIndex + 1);
    const nextPhase = PHASES[phaseIndex + 1];
    const cumulativeIds = new Set(includedPhases.flatMap((phaseName) => PHASE_CONSTRAINTS[phaseName] ?? []));
    const phaseOnlyIds = new Set(PHASE_CONSTRAINTS[input.phase] ?? []);
    const filteredActive = input.activeConstraints.filter((doc) => cumulativeIds.has(doc.meta.id));
    if (filteredActive.length === 0) {
        throw createError("CONFIG_ERROR", `Phase '${input.phase}' currently has no active constraints. Disable overrides or pick another phase.`);
    }
    const disabledConstraintIds = input.disabledConstraints
        .filter((doc) => cumulativeIds.has(doc.meta.id))
        .map((doc) => doc.meta.id);
    const allConstraintIds = new Set(input.allConstraints.map((doc) => doc.meta.id));
    const missingConstraintIds = Array.from(cumulativeIds).filter((id) => !allConstraintIds.has(id));
    const info = {
        phase: input.phase,
        phaseNumber: phaseIndex + 1,
        includedPhases,
        nextPhase,
        phaseDefinedCount: PHASE_CONSTRAINTS[input.phase]?.length ?? 0,
        phaseActiveCount: filteredActive.filter((doc) => phaseOnlyIds.has(doc.meta.id)).length,
        cumulativeDefinedCount: Array.from(cumulativeIds).length,
        cumulativeActiveCount: filteredActive.length,
    };
    return {
        constraints: filteredActive,
        info,
        disabledConstraintIds,
        missingConstraintIds,
    };
}
export function buildPhasePromptContext(info) {
    const phaseLabel = buildPhaseLabel(info.phase, info.phaseNumber);
    const objectiveLines = PHASE_OBJECTIVES[info.phase];
    const includedLabels = info.includedPhases.map((phaseName) => buildPhaseLabel(phaseName, PHASES.indexOf(phaseName) + 1));
    const validationLines = buildValidationLines(includedLabels, info.phaseNumber);
    const timelineLines = [
        `You are implementing ${phaseLabel} of ${PHASES.length} phases:`,
        ...PHASES.map((phaseName, idx) => {
            const status = idx < info.phaseNumber - 1
                ? "COMPLETED"
                : idx === info.phaseNumber - 1
                    ? "IN PROGRESS"
                    : "PENDING";
            const label = buildPhaseLabel(phaseName, idx + 1);
            const summary = PHASE_SUMMARIES[phaseName];
            return `- ${label} - ${status}: ${summary}`;
        }),
    ];
    const nextSteps = buildNextSteps(info);
    const metadata = {
        phase_mode: info.phase,
        phase_number: info.phaseNumber,
        phase_label: phaseLabel,
        included_phases: info.includedPhases,
        constraints_in_phase: info.phaseDefinedCount,
        cumulative_constraints: info.cumulativeDefinedCount,
        next_phase: info.nextPhase,
    };
    return {
        metadata,
        phaseActiveCount: info.phaseActiveCount,
        cumulativeActiveCount: info.cumulativeActiveCount,
        objectiveLines,
        validationLines,
        contextLines: timelineLines,
        keyPrinciples: PHASE_KEY_PRINCIPLES[info.phase],
        nextSteps,
    };
}
export function formatPhaseWarnings(result) {
    const label = buildPhaseLabel(result.info.phase, result.info.phaseNumber);
    const warnings = [];
    if (result.disabledConstraintIds.length > 0) {
        warnings.push(`${label} has ${result.disabledConstraintIds.length} disabled constraint(s): ${result.disabledConstraintIds.join(", ")}. They will be skipped until re-enabled.`);
    }
    if (result.missingConstraintIds.length > 0) {
        warnings.push(`${label} references missing constraint ids: ${result.missingConstraintIds.join(", ")}. Update PHASE_CONSTRAINTS or ensure the markdown files exist.`);
    }
    return warnings;
}
function buildValidationLines(includedLabels, phaseNumber) {
    const formattedList = formatPhaseList(includedLabels);
    const lines = [
        `Validation scope: This prompt checks ${formattedList} constraints.`,
    ];
    if (phaseNumber === 1) {
        lines.push("This is the foundation phase; everything else depends on it.");
    }
    else {
        const previousLabel = includedLabels[includedLabels.length - 2];
        lines.push(`Previous phase (${previousLabel}) should already be validated and passing.`);
    }
    return lines;
}
function formatPhaseList(labels) {
    if (labels.length === 1) {
        return labels[0];
    }
    const head = labels.slice(0, -1).join(", ");
    const tail = labels[labels.length - 1];
    return `${head} and ${tail}`;
}
function buildPhaseLabel(phase, phaseNumber) {
    return `Phase ${phaseNumber}: ${PHASE_TITLES[phase]}`;
}
function buildNextSteps(info) {
    const label = buildPhaseLabel(info.phase, info.phaseNumber);
    const steps = [
        `After implementing ${label} changes:`,
        "1. Run `npm run build` to ensure TypeScript compilation succeeds.",
        `2. Run \`cda run --phase ${info.phase} --exec\` to validate included constraints.`,
        "3. Fix any violations before proceeding.",
    ];
    if (info.nextPhase) {
        const nextLabel = buildPhaseLabel(info.nextPhase, PHASES.indexOf(info.nextPhase) + 1);
        steps.push(`4. Once validation passes, advance to ${nextLabel}:`);
        steps.push(`   - Run \`cda agent --phase ${info.nextPhase} --dry-run\``);
        steps.push("   - Review the next phase prompt");
        steps.push(`   - Focus on ${PHASE_SUMMARIES[info.nextPhase].toLowerCase()}`);
        steps.push(`Do NOT start ${nextLabel} work while executing ${label}. Stay focused on ${PHASE_SUMMARIES[info.phase].toLowerCase()}.`);
    }
    else {
        steps.push("4. After presentation validation passes, begin release prep and regression hardening.");
    }
    return steps;
}
