# Architecture Overview

This project is optimized for AI agents and humans to work efficiently together.

The tech stack is intentionally fixed so that AI agents do not have to choose tools.

**Tech Stack (Non‑Negotiable)**

- Package manager: **npm** with **npm workspaces** (monorepo).
- Language: **TypeScript** everywhere.
- Frontend: **Next.js (React)**, **TanStack Query**, **Axios**.
- Backend: **Node.js**, **Fastify**, **Zod**, optional **Prisma** for database access.
- Shared contracts: **Zod** schemas and inferred types in `packages/shared-types`.
- Testing: **Vitest** for unit/integration tests, **Testing Library** for React.

## Goals

- Single language: **TypeScript** everywhere (frontend, backend, shared).
- Clear, repeatable structure per feature.
- Strong, shared types for all data flowing between frontend and backend.
- Small, focused files with one responsibility.

---

## Repository Layout

```text
/
  package.json
  tsconfig.base.json
  /apps
    /web            # Frontend (Next.js React app)
    /api            # Backend (Node/TS with Fastify)
  /packages
    /shared-types   # Shared DTOs and domain primitives
```

Each **feature** (e.g. `users`, `auth`) exists in all relevant places:

```text
/apps/api/src/features/users/...
/apps/web/src/features/users/...
/packages/shared-types/src/user.ts
```

---

## Shared Types (Source of Truth)

All request/response shapes and common domain types live in `packages/shared-types`.

Example:

```ts
// packages/shared-types/src/user.ts
export interface UserDto {
  id: string;
  email: string;
  name: string;
}

export interface CreateUserInput {
  email: string;
  name: string;
}

export interface CreateUserOutput {
  user: UserDto;
}
```

**Rules:**

- Frontend and backend must import types from `@shared-types/...`.
- Do not redefine these shapes locally.

---

## Backend Architecture (Clean / Hexagonal)

Backend is organized by **features**, each using a simple hexagonal structure:

```text
/apps/api/src/features/<feature>/
  http.controller.ts     # HTTP adapter: defines routes, parses input, sends JSON
  usecases/              # Application layer (business flows)
    <useCaseName>.ts
  domain/                # (Optional) rich domain logic (entities, value objects)
    ...
  infra/                 # Adapters (repos, external APIs, implementations)
    ...
```

### Responsibilities

- `http.controller.ts`
  - Register routes/endpoints.
  - Parse/validate HTTP input.
  - Call the appropriate use case.
  - Map output to HTTP responses (typically JSON).

- `usecases/*`
  - Application logic.
  - Pure functions or small classes with:
    - Typed input (from `shared-types`).
    - Typed output (from `shared-types`).
  - Orchestrate domain + infra; no HTTP concerns.

- `domain/*` (optional)
  - Domain entities and value objects when logic is complex.
  - No framework dependencies.

- `infra/*`
  - Repositories and external service adapters.
  - Implement interfaces used by use cases or domain.
  - Example: `usersRepo.ts` with in-memory or DB-backed implementations.

**Rule for agents:**  
To add/change a backend feature, work in `apps/api/src/features/<feature>`:
- New endpoint → update `http.controller.ts` + add/modify a use case.
- New persistence/external integration → add/extend infra adapter.

---

## Frontend Architecture (React + Hooks, MVVM-ish)

Frontend is also organized by **features**:

```text
/apps/web/src/features/<feature>/
  components/           # Presentational UI (Views)
    *.tsx
  hooks/                # Behavior/data logic (ViewModels)
    useSomething.ts
```

Plus common libraries:

```text
/apps/web/src/lib/
  apiClient.ts          # HTTP client (e.g. axios/fetch wrapper)
  queryClient.ts        # TanStack Query client setup
```

### Responsibilities

- `components/*` (View)
  - Render UI.
  - Receive data and callbacks via props.
  - Minimal logic: mostly presentational.

- `hooks/*` (ViewModel)
  - Own all async/data-fetching logic (React Query, etc.).
  - Call backend endpoints using shared types.
  - Expose simple, UI-friendly state:
    - `data`, `isLoading`, `error`, `actions`.

Example:

```ts
// apps/web/src/features/users/hooks/useCreateUser.ts
import { useMutation } from '@tanstack/react-query';
import { CreateUserInput, CreateUserOutput } from '@shared-types/user';
import { apiClient } from '../../lib/apiClient';

export function useCreateUser() {
  const mutation = useMutation<CreateUserOutput, Error, CreateUserInput>({
    mutationFn: async (payload) => {
      const { data } = await apiClient.post<CreateUserOutput>('/users', payload);
      return data;
    },
  });

  return {
    createUser: mutation.mutate,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}
```

**Rule for agents:**

- UI rendering changes → `components/`.
- Data fetching / business-ish UI logic → `hooks/`.
- Data shapes → `shared-types`.

---

## Feature-Based Organization

Every feature should follow this pattern:

```text
# Backend
/apps/api/src/features/<feature>/
  http.controller.ts
  usecases/
  domain/
  infra/

# Frontend
/apps/web/src/features/<feature>/
  components/
  hooks/

# Shared
/packages/shared-types/src/<feature>.ts
```

This mirroring is intentional so that:
- Backend feature and frontend feature are easy to find.
- Shared contracts are in a predictable place.

---

## Conventions for New Code

When adding a new feature or endpoint:

1. **Define types** in `packages/shared-types/src/<feature>.ts`.
2. **Backend**:
   - Add/extend use case(s) in `apps/api/src/features/<feature>/usecases`.
   - Wire it via `http.controller.ts`.
   - Add/extend infra if needed.
3. **Frontend**:
   - Create/extend hooks in `apps/web/src/features/<feature>/hooks`.
   - Use those hooks in `components/` or pages.
4. Keep functions small and typed; prefer many focused files over one large one.

---

## Testing (high-level)

- Backend:
  - Unit-test use cases and domain logic (no HTTP or DB).
- Frontend:
  - Test hooks (ViewModels) and critical components.

Tests should follow the same feature-based structure where possible.

---

## Summary

- **Backend**: Clean/Hexagonal, feature-based, with `http.controller.ts`, `usecases`, optional `domain`, and `infra`.
- **Frontend**: React with components (View) and hooks (ViewModel), feature-based.
- **Shared**: All contracts in `shared-types`.

This layout is intentionally repetitive and predictable so that both humans and AI agents can quickly locate, extend, and safely modify functionality.