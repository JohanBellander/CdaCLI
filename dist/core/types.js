export const CONSTRAINT_GROUPS = [
    "patterns",
    "architecture",
    "best-practices",
    "frameworks",
    "contracts",
];
export const PHASES = [
    "foundation",
    "domain",
    "infrastructure",
    "application",
    "presentation",
];
export const PHASE_CONSTRAINTS = {
    foundation: [
        "central-config-entrypoint",
        "observability-discipline",
        "structural-naming-consistency",
        "file-naming",
        "folder-naming",
        "max-file-lines",
        "excessive-nesting",
    ],
    domain: [
        "domain-purity",
        "domain-no-side-effects",
        "domain-no-imports-from-app-or-infra",
        "single-responsibility",
        "module-complexity-guardrails",
        "shared-types-zod-source-of-truth",
        "zod-contracts",
    ],
    infrastructure: [
        "ports-and-adapters-integrity",
        "clean-layer-direction",
        "prisma-data-access",
        "axios-client-only",
        "api-boundary-hygiene",
    ],
    application: [
        "mvc-layer-separation",
        "mvp-presenter-boundaries",
        "mvvm-binding-integrity",
        "app-no-imports-from-infra",
        "ui-isolation",
        "test-coverage-contracts",
    ],
    presentation: [
        "fastify-http-server",
        "nextjs-app-structure",
        "react-ui-only",
        "tanstack-query-async",
    ],
};
