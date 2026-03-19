# coc — MVP narrativo (Call of Cthulhu)

Monorepo (pnpm workspaces) con:

- `packages/types`: tipos del dominio (Scenario, GameState, GameEvent…)
- `packages/engine`: motor puro (resuelve acciones, tiradas, efectos, transiciones)
- `packages/schemas`: validación Zod de escenarios
- `packages/protocol`: DTOs de transporte (REST + Socket.io)
- `apps/backend`: NestJS + Socket.io (servidor autoritativo, sesiones in‑memory)
- `apps/frontend`: React + Vite (UI de debug: create/join/actions, eventos, estado)

## Quickstart

Requisitos: Node + pnpm.

1) Instalar:

`pnpm install`

2) Backend (dev):

`pnpm dev`

3) Frontend (dev):

`pnpm dev:front`

## Smoke test (Socket, 2 jugadores)

Con el backend arrancado:

`pnpm smoke:socket`

Opciones:

- `node scripts/smoke-socket.js --url http://localhost:3000 --scenario test --action enter_house --players 2`

## Manual de escenarios

`SCENARIO_MANUAL.md`

## Variables de entorno (backend)

- `PORT` (default `3000`)
- `SCENARIOS_DIR` (si no se define, busca `./scenarios` y parents)
- `SESSION_TTL_MS` (default 30 min)
- `PLAYER_TTL_MS` (default 10 min)
- `SESSION_CLEANUP_INTERVAL_MS` (default 30 s)

## Scripts raíz

- `pnpm clean` / `pnpm build` (compila packages + apps)
- `pnpm dev` (build packages + backend dev)
- `pnpm dev:front` (build packages + frontend dev)
- `pnpm smoke:socket`
