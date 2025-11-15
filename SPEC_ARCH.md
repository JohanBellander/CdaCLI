# Architecture-Aligned Constraint Specification (`SPEC_ARCH.md`)

## 1. Purpose and Scope

This specification describes how CDA constraints should align with the architecture defined in `ARCHITECTURE.md`. It introduces:

- A **grouping model** for constraints (Patterns, Architecture, Best Practices, Frameworks, Contracts).
- A set of **framework-specific constraints** that can be composed to "piece together" an opinionated stack.
- Mapping between the architecture (monorepo layout, tech stack) and the constraints that enforce it.

This spec is **design-level**: it guides how to structure constraints, but does not prescribe internal implementation details of the CDA engine.

---

## 2. Architectural Baseline (from `ARCHITECTURE.md`)

### 2.1 Monorepo Structure

The repo is a TypeScript monorepo (npm workspaces) with:

- `apps/web` – Next.js + React frontend.
- `apps/api` – Node.js backend with Fastify.
- `packages/shared-types` – Zod-based shared schemas and types.

### 2.2 Frontend Architecture (`apps/web`)

- **Frameworks**: Next.js, React, TanStack Query (React Query), Axios.
- **Structure**:
  - Feature-based: `apps/web/src/features/<feature>/components`, `hooks`, etc.
  - Shared libraries: `apps/web/src/lib/apiClient.ts`, `apps/web/src/lib/queryClient.ts`.
- **Principles**:
  - UI components are **dumb** (pure rendering, minimal side effects).
  - Data fetching and IO flows through TanStack Query + a central Axios-based client.

### 2.3 Backend Architecture (`apps/api`)

- **Frameworks**: Fastify, Zod, (optional) Prisma.
- **Structure**:
  - Feature-based: `apps/api/src/features/<feature>/http.controller.ts`.
  - Clear layers per feature: `http.controller` → `usecases` → `domain` → `infra`.
- **Principles**:
  - Domain layer is pure (no IO, no framework imports).
  - Use cases orchestrate domain and call into infra via ports/adapters.

### 2.4 Shared Contracts (`packages/shared-types`)

- Zod schemas and types define contracts for:
  - HTTP request/response shapes.
  - Domain value objects.
- Backend and frontend import from `@shared-types/...`.

---

## 3. Constraint Grouping Model

Each constraint must declare a `group` in its frontmatter to support organization and selection.

### 3.1 Groups

Allowed values for `group`:

- `patterns` – Architectural and design patterns (e.g. hexagonal, ports & adapters, MV* variants).
- `architecture` – Layering, ownership, and directory structure rules.
- `best-practices` – General code quality and hygiene (naming, complexity, observability).
- `frameworks` – Rules that mandate or constrain usage of specific frameworks/tools.
- `contracts` – Rules about cross-service / cross-layer contracts, schemas, and shared types.

### 3.2 Frontmatter Example

Existing constraint markdown files under `src/constraints/core/` will be extended like:

```yaml
---
id: domain-no-imports-from-app-or-infra
name: Domain layer must not depend on app or infra
category: architecture
severity: error
enabled: true
optional: false
version: 1
group: architecture
---
```

The `group` field is required for all new constraints and will be gradually added to existing ones.

---

## 4. Mapping Constraints to Architecture

This section connects the architecture to constraint groups and identifies what is needed.

### 4.1 Architecture Group

Constraints that enforce the high-level layering and module boundaries:

- `domain-no-imports-from-app-or-infra` → `group: architecture`.
- `app-no-imports-from-infra` → `group: architecture`.
- `clean-layer-direction` → `group: architecture`.
- `ui-isolation` (reframed to fit React UI + hooks/clients) → `group: architecture`.
- `central-config-entrypoint` → `group: architecture`.

Alignment with `ARCHITECTURE.md`:

- Domain, usecase, infra, and UI responsibilities must match the documented layering.
- UI must not directly invoke infra or domain; instead, it talks to an HTTP/API layer.

### 4.2 Patterns Group

Constraints that enforce specific patterns:

- `ports-and-adapters-integrity` → `group: patterns`.
- `mvc-layer-separation`, `mvp-presenter-boundaries`, `mvvm-binding-integrity` → `group: patterns` (may be disabled by default in a React+hooks setting but available for projects that want them).

Alignment with `ARCHITECTURE.md`:

- Backend follows hexagonal architecture (ports/usecases/adapters).
- Frontend may use a simpler React+hooks pattern; MV* constraints are optional.

### 4.3 Best Practices Group

Constraints for quality and hygiene, not tied to a framework:

- `single-responsibility` → `group: best-practices`.
- `max-file-lines` → `group: best-practices`.
- `excessive-nesting` → `group: best-practices`.
- `file-naming`, `folder-naming`, `structural-naming-consistency` → `group: best-practices`.
- `observability-discipline` → `group: best-practices`.
- `test-coverage-contracts` → `group: best-practices`.

These apply universally across the monorepo.

### 4.4 Contracts Group

Constraints governing the contracts and shared types:

- `api-boundary-hygiene` → `group: contracts`.
- New: `shared-types-zod-source-of-truth` (Section 5.5) → `group: contracts`.

Alignment with `ARCHITECTURE.md`:

- Enforces that `packages/shared-types` is the single source of truth for Zod schemas used in both `apps/api` and `apps/web`.

### 4.5 Frameworks Group

Constraints that mandate or limit usage of specific frameworks/tools used by the architecture:

- New: `fastify-http-server` → `group: frameworks`.
- New: `zod-contracts` → `group: frameworks`.
- New: `prisma-data-access` (optional) → `group: frameworks`.
- New: `nextjs-app-structure` → `group: frameworks`.
- New: `react-ui-only` → `group: frameworks`.
- New: `tanstack-query-async` → `group: frameworks`.
- New: `axios-client-only` → `group: frameworks`.

These allow composing a stack from small, framework-specific pieces.

---

## 5. Framework-Specific Constraints

Each constraint in this section is intended to be a small, composable unit that mandates one framework/tool or a coherent aspect of its usage. The intent is that a project can enable:

- Framework-agnostic architecture and pattern constraints.
- A specific combination of framework constraints to get the desired stack.

### 5.1 `fastify-http-server` (Frameworks)

**Intent:** Mandate Fastify as the HTTP server framework for `apps/api`.

**Scope:** Files under `apps/api/src`.

**Rules (conceptual):**

- HTTP controllers (e.g. `apps/api/src/features/*/http.controller.ts`) must:
  - Import Fastify types (`FastifyInstance`, `FastifyReply`, `FastifyRequest`) from `fastify`.
  - Register routes using Fastify APIs.
- No other HTTP server frameworks (e.g. Express, Koa, Hapi) may be imported in `apps/api`.
- Fastify-specific plugins and hooks should be registered in a centralized server bootstrap (e.g. `apps/api/src/server.ts`).

### 5.2 `zod-contracts` (Frameworks)

**Intent:** Require Zod for validation of external inputs/outputs in both backend and frontend.

**Scope:** `apps/api`, `apps/web`, `packages/shared-types`.

**Rules (conceptual):**

- HTTP boundary handlers in `apps/api` must validate inputs/outputs with Zod schemas.
- Forms or data submitted from the frontend must be validated using Zod or types derived from Zod.
- Custom validation libraries for the same purpose (e.g. Joi, Yup) are not allowed when this constraint is enabled.

### 5.3 `prisma-data-access` (Frameworks, optional)

**Intent:** Standardize data access via Prisma for backends that opt in.

**Scope:** `apps/api/src`.

**Rules (conceptual):**

- `infra` layer (e.g. `apps/api/src/features/*/infra`) must:
  - Use `@prisma/client` for database access.
  - Avoid direct SQL strings or other ORM libraries when this constraint is enabled.
- Domain and usecase layers must not import `@prisma/client`; they depend on interfaces/ports instead.

### 5.4 `nextjs-app-structure` (Frameworks)

**Intent:** Enforce Next.js layout and file calling conventions for `apps/web`.

**Scope:** `apps/web`.

**Rules (conceptual):**

- Next.js routing and app structure must follow the configured paradigm (e.g. `app/` router or `pages/` router):
  - If using `app` directory: React Server Components in `apps/web/src/app`, route segments under that tree.
  - If using `pages` directory: pages in `apps/web/src/pages`.
- Feature code must live under `apps/web/src/features/<feature>` and not directly in the routing folders beyond simple wiring/entry files.
- Next.js-specific APIs (`getServerSideProps`, `generateMetadata`, or `route.js` handlers) should be thin wrappers delegating to feature hooks/services.

### 5.5 `react-ui-only` (Frameworks)

**Intent:** Keep React components focused on presentation logic and light state, not IO or domain orchestration.

**Scope:** `apps/web/src/features/*/components` (and other component folders as configured).

**Rules (conceptual):**

- React components under `components/` must not:
  - Import `axios`, `@tanstack/react-query`, or low-level HTTP/IO clients directly.
  - Import backend-specific modules or domain/infra implementation details.
- Components should:
  - Receive data and callbacks via props or hooks.
  - Use small, local UI state only (e.g. `useState`, `useReducer`) for view concerns.

### 5.6 `tanstack-query-async` (Frameworks)

**Intent:** Enforce use of TanStack Query for async data fetching on the frontend.

**Scope:** `apps/web/src`.

**Rules (conceptual):**

- Asynchronous HTTP calls in React code (fetching or mutating remote data) must be implemented via TanStack Query (`useQuery`, `useMutation`, `useInfiniteQuery`, etc.).
- Ad-hoc `fetch`/`axios` calls in components or hooks that bypass TanStack Query are disallowed when they fit the query/mutation pattern.
- A single `QueryClient` must be created in a shared location, e.g. `apps/web/src/lib/queryClient.ts`, and provided at the app root.

### 5.7 `axios-client-only` (Frameworks)

**Intent:** Centralize HTTP client usage on the frontend using a shared Axios instance.

**Scope:** `apps/web/src`.

**Rules (conceptual):**

- All HTTP calls must go through a shared client module (e.g. `apps/web/src/lib/apiClient.ts`).
- Direct `axios` imports scattered across the codebase are disallowed; only the shared client module should import `axios`.
- The client module may handle concerns like base URL, interceptors, and auth headers.

### 5.8 `shared-types-zod-source-of-truth` (Contracts)

**Intent:** Make `packages/shared-types` the single source of truth for Zod-based contracts.

**Scope:** `apps/web`, `apps/api`, `packages/shared-types`.

**Rules (conceptual):**

- Zod schemas defining cross-boundary contracts must live under `packages/shared-types`.
- `apps/api` and `apps/web` must **import** types/schemas from `@shared-types/...` instead of re-declaring them locally.
- Local Zod schemas are allowed only for purely internal concerns that never cross a process boundary.

---

## 6. How Groups Work Together with `ARCHITECTURE.md`

### 6.1 Composing a Stack

To realize the architecture in `ARCHITECTURE.md`, a project can:

1. Enable **Architecture** constraints:
   - `domain-no-imports-from-app-or-infra`, `app-no-imports-from-infra`, `clean-layer-direction`, `ui-isolation` (React-aligned), `central-config-entrypoint`.
2. Enable **Patterns** constraints supporting hexagonal design:
   - `ports-and-adapters-integrity`.
3. Enable **Frameworks** constraints for the desired stack:
   - `fastify-http-server`, `zod-contracts`, `nextjs-app-structure`, `react-ui-only`, `tanstack-query-async`, `axios-client-only`, and optionally `prisma-data-access`.
4. Enable **Contracts** constraints:
   - `api-boundary-hygiene`, `shared-types-zod-source-of-truth`.
5. Enable **Best Practices** constraints as desired for quality.

### 6.2 Opting In/Out

- Teams can choose a subset of framework constraints to adapt the stack (e.g. use `zod-contracts` and `react-ui-only` without `fastify-http-server`).
- Pattern and architecture constraints remain largely framework-agnostic, making it possible to swap frameworks while preserving core structure.

---

## 7. Implementation Notes (Non-Normative)

- The CDA engine should treat `group` as metadata for display, filtering, and configuration UX (e.g. grouping in `cda config`).
- Each framework constraint should be small and focused; avoid combined constraints that mandate multiple frameworks at once.
- Where existing constraints conflict with this architecture (e.g. overly strict MV* or UI isolation semantics), they should be refined or made optional so they can coexist with the React+hooks + Query + Axios stack.

This specification is the reference point for aligning future constraints with the architecture described in `ARCHITECTURE.md` and for growing a composable set of framework-specific rules.