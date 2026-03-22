# Life OS Dashboard

Modular React + Vite + TypeScript personal operating system for finance, projects, tasks, planning, homelab, and utility workflows.

## Tech Stack

- React + Vite + TypeScript
- TailwindCSS
- Zustand (state management)
- React Router (nested routing)

## Run locally

```bash
npm install
npm run dev
```

## Core scripts

```bash
npm run typecheck
npm run build
npm run preview
```

## Module architecture

Each module is self-contained under `src/modules/<module-name>/`:

- `components/`
- `pages/`
- `hooks/`
- `state/` (optional for local module store)
- `types.ts`
- `index.ts` (exports route config + public module API)

Implemented modules:
- Dashboard
- Finance
- Projects
- Homelab
- Tasks
- Planning
- Tools

## Layout and routing

- Root shell: `src/components/layout/AppShell.tsx`
- Shared navigation metadata + routes: `src/routes/moduleRegistry.ts`
- Router entry: `src/routes/router.tsx`

## State

- Global app state: `src/store/useAppStore.ts`
  - user preferences
  - active modules
  - quick stats
- Module-local persisted state via local storage repositories.

## Services

- API interface placeholder: `src/services/api/client.ts`
- Local storage repository abstraction: `src/services/storage/localStorageRepository.ts`

## Production

See [PRODUCTION.md](./PRODUCTION.md) for deployment, security, and release checklist.
