# CTHULHU ENGINE — DOCUMENTO DE ARQUITECTURA (ACTUALIZADO)

> **Estado del documento:** actualizado para reflejar el repo tal y como está a día de hoy (incluyendo ficheros vacíos/WIP).

## 1. Visión y alcance (realidad actual)

El proyecto es un **monorepo** (pnpm workspaces) cuyo objetivo es construir un motor para experiencias tipo *La Llamada de Cthulhu*. En el estado actual, la “realidad” del proyecto es un **MVP narrativo**:

- Escenarios declarativos en JSON (escenas + acciones)
- Resolución de acciones con:
  - tiradas d100 por habilidad (normal/hard/extreme)
  - condiciones simples (flags y resultado de tirada)
  - efectos mínimos (por ahora, flags)
- Backend autoritativo con sesiones en memoria
- Transporte en tiempo real con Socket.io
- Frontend React como UI de prueba (no productizada)

Todo lo demás (combate táctico, i18n, assets, info parcial por jugador, etc.) está **planificado**, pero no implementado.

---

## 2. Principios que siguen vigentes

- **Motor puro, UI agnóstica:** el engine (`packages/engine`) no debería depender de React/Nest/Socket.io.
- **Contenido declarativo:** el escenario describe *qué* puede ocurrir; el engine define *cómo* resolverlo.
- **Backend autoritativo:** el estado “real” vive en servidor; el cliente es una vista + input.
- **Extensibilidad por tipos:** mecánicas nuevas = nuevos tipos de `Condition`/`Effect`/etc. + handlers.

---

## 3. Arquitectura actual del repo

### 3.1 Estructura

```
apps/
  backend/        (NestJS + Socket.io; sesiones in-memory)
  frontend/       (React + Vite; UI de prueba)
packages/
  engine/         (núcleo: GameEngine + systems)
  types/          (tipos TS compartidos: Scenario/GameState/etc.)
  schemas/        (WIP: validación con Zod; actualmente vacío)
scenarios/        (JSON de escenarios; algunos ficheros vacíos)
```

### 3.2 Flujo de ejecución (lo que existe hoy)

1. El cliente se conecta por Socket.io al backend.
2. El cliente hace `join(sessionId)`; el backend asigna un personaje disponible.
3. El cliente envía `action(sessionId, actionId, playerId)`.
4. El backend llama a `engine.dispatch(actionId, characterId)`:
   - resuelve tirada si aplica
   - aplica efectos
   - decide transición a escena siguiente
5. El backend emite `state_update` con un “view” (escena actual + estado).

---

## 4. Modelo de estado (implementado)

Fuente única de verdad dentro del engine.

```ts
export type GameState = {
  currentSceneId: string
  flags: Record<string, boolean>
  characters: Record<string, Character>
  lastRoll?: RollResult
}
```

Notas:
- No existe aún el concepto de “modo” (narrativa/combate), inventario estructurado, log de eventos, etc.
- `lastRoll` se usa como input para condiciones (`roll_success` / `roll_failure`).

---

## 5. Modelo de contenido (implementado)

### Scenario

```ts
export type Scenario = {
  characters: Character[]
  scenes: Scene[]
}
```

### Scene

```ts
export type Scene = {
  id: string
  actions: Action[]
}
```

### Action

```ts
export type Action = {
  id: string
  effects?: Effect[]
  next?: { condition?: Condition; sceneId: string }[]
  skillCheck?: SkillCheck
}
```

### Condition (estado actual)

```ts
export type Condition =
  | { type: "flag"; flag: string; value: boolean }
  | { type: "roll_success" }
  | { type: "roll_failure" }
```

### Effect (estado actual)

```ts
export type Effect =
  | { type: "add_flag"; flag: string }
```

---

## 6. Sistemas del engine (implementado vs WIP)

Implementado:
- `NarrativeSystem`: `resolveAction(...)` (acciones, tiradas, efectos, transición)
- `DiceSystem`: `resolveSkillCheck(...)` + `rollD100()`
- `ConditionSystem`: flags y resultado de la última tirada
- `EffectSystem`: `add_flag`
- `State`: estado inicial a partir del `Scenario`

WIP / vacío:
- `CombatSystem`: fichero existe pero sin implementación.

---

## 7. Backend (realidad actual)

El backend es un **servidor NestJS** que:

- Mantiene un mapa `sessions` en memoria: `sessionId -> { engine, players }`
- Asigna un `characterId` libre al hacer `join`
- Expone REST mínimo (`/game/session`, `/game/:sessionId/join`, etc.) y Socket.io (`join`, `action`)

No existe aún:
- Persistencia (DB o snapshots)
- Carga dinámica de escenarios (ahora se importa un JSON fijo)
- Validación de escenarios en runtime (aunque hay intención de usar Zod)
- Filtrado de estado por jugador / info parcial

---

## 8. Frontend (realidad actual)

El frontend es una **UI de prueba**:
- Se conecta a `http://localhost:3000`
- Hace `join` a un `SESSION_ID` hardcodeado
- Renderiza `state` y lista botones de acciones de la escena

No es todavía un cliente “real” (no crea sesión, no gestiona reconexión, no separa vistas, etc.).

---

## 9. Decisiones y trade-offs (consciente)

- **Socket.io** para iteración rápida de multiplayer.
- **Engine como librería TS** para compartir lógica entre backend y herramientas (tests/CLI futuros).
- **Contenido JSON** sin validación todavía: acelera prototipado, pero introduce riesgo de roturas.
- **Sesiones in-memory**: suficiente para MVP local; no apto para producción.

---

## 10. Invariantes (regla fundamental)

Si para hacer un escenario necesitas escribir código “ad-hoc” en backend/frontend (en vez de extender `types` + `systems`), el motor está mal diseñado.

---

## 11. Roadmap (actualizado y incremental)

1. Alinear tipos + escenario + validación (Zod) y añadir tests mínimos del engine.
2. Introducir capa de carga de escenarios (por id / fichero) en backend.
3. Mejorar la API de engine (acciones, errores, eventos) y separar “view” de “state”.
4. Mejorar frontend (crear/join sesión, estado reactivo, UI narrativa mínima).
5. Extender efectos/condiciones (inventario, variables numéricas, etc.).
6. Multiplayer real (reconexión, roles, y eventualmente info parcial).
7. CombatSystem (cuando el loop narrativo esté sólido).
