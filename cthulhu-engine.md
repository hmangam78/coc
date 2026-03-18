# CTHULHU ENGINE — DOCUMENTO DE ARQUITECTURA Y DISEÑO

## 1. VISIÓN GENERAL

Este proyecto consiste en un **motor de juego narrativo-táctico modular**, orientado a experiencias tipo *La Llamada de Cthulhu*, con soporte para:

- Narrativa ramificada
- Tiradas de dados (d100)
- Multijugador cooperativo con información parcial
- Combate táctico por turnos en grid isométrico
- Contenido desacoplado del motor (reutilizable)

---

## 2. OBJETIVOS DEL PROYECTO

### Objetivos técnicos
- Diseñar un **motor genérico reutilizable**
- Separar completamente:
  - lógica de juego
  - contenido
  - renderizado
- Soportar multiplayer con estado autoritativo en backend
- Permitir escalabilidad futura (nuevos escenarios, editor, etc.)

### Objetivos funcionales
- Ejecutar escenarios narrativos complejos
- Permitir decisiones con consecuencias
- Integrar combate táctico
- Soportar múltiples jugadores colaborando

---

## 3. PRINCIPIOS DE DISEÑO

### 3.1 Declarativo vs imperativo
- El contenido (JSON) describe **qué ocurre**
- Personajes pregenerados embebidos en JSON de contenido
- El motor define **cómo ocurre**

### 3.2 Separación estricta de responsabilidades
- Motor no conoce UI
- Frontend no contiene lógica de juego
- Backend es autoridad

### 3.3 Extensibilidad
- Nuevas mecánicas = nuevos tipos de `effects`, `conditions`, etc.

### 3.4 Reutilización
- Un mismo motor debe soportar múltiples escenarios

---

## 4. ARQUITECTURA GENERAL
CONTENT (JSON) -> GAME ENGINE (backend, puro) -> APPLICATION LAYER -> DELIVERY (WebSockets / REST) -> FRONTEND (React + Renderer)

---

## 5. CAPAS DEL SISTEMA

---

### 5.1 CONTENT LAYER (Escenarios)

#### Qué es
Definición declarativa del juego.

#### Incluye
- escenas
- acciones
- condiciones
- efectos
- transiciones
- textos (i18n)
- assets (audio, imágenes)

#### Qué NO incluye
- lógica ejecutable
- código

---

### 5.2 GAME ENGINE (núcleo)

#### Qué es
Sistema puro que:
- interpreta el JSON
- aplica reglas
- gestiona estado

---

#### Submódulos (Systems)

##### StateManager
- gestiona GameState
- controla mutaciones

##### NarrativeSystem
- gestiona escenas narrativas
- resuelve acciones

##### CombatSystem
- combate táctico
- turnos
- IA

##### ConditionSystem
- evalúa condiciones

##### EffectSystem
- ejecuta efectos

##### DiceSystem
- tiradas d100
- niveles de éxito

---

### 5.3 APPLICATION LAYER

#### Responsabilidades
- gestionar sesiones
- invocar engine
- filtrar estado por jugador
- orquestar flujo

---

### 5.4 DELIVERY LAYER

#### WebSocket
- comunicación en tiempo real
- multiplayer
- chat

#### REST
- carga de escenarios
- utilidades

---

### 5.5 FRONTEND

#### Responsabilidades
- renderizar estado
- enviar acciones
- gestionar UI

#### Subcomponentes
- Narrative UI
- Combat UI
- Inventario
- Chat

---

## 6. GAME STATE

Fuente única de verdad.

```ts
GameState {
  sessionId
  players
  currentMode
  narrative
  combat
  inventory
}
```

## 7. MODELO DE EJECUCIÓN

Cliente → acción
↓
Servidor (WebSocket)
↓
Application Layer
↓
Game Engine
↓
Nuevo estado + eventos
↓
Filtrado por jugador
↓
Broadcast
↓
Frontend renderiza

## 8. MODELO DE CONTENIDO

### Escena

```
JSON
{
  "id": "library",
  "type": "narrative",
  "content": { "text": {...} },
  "actions": []
}
```

### Acción

```
JSON
{
  "id": "read_book",
  "effects": [],
  "next": []
}
```

### Condición

```
JSON
{
  "type": "flag",
  "flag": "found_clue",
  "value": true
}
```

### Efecto

```
{
  "type": "add_flag",
  "flag": "found_clue"
}
```

## 9. SISTEMA DE TIRADAS
-   d100

-   ejecutado en servidor

-   niveles:
    -   fumble

    -   failure

    -   success

    -   hard success

    -   extreme success

## 10. COMBATE TÁCTICO

### Características

-   grid cartesiano

-   vista isométrica (frontend)

-   turnos por iniciativa

-   IA básica

### Separación

Combat Engine (lógica)
↓
Renderer (Phaser / Canvas)

## 11. MULTIPLAYER

### Modelo

-   Servidor autoritativo
-   Clientes como vistas

### Información parcial

```
getVisibleState(playerId)
```

### 12. Estructura del proyecto

project-root/

-   apps/
    -   backend/
    -   frontend/

-   packages/
    -   engine/
    -   types/
    -   schemas/

-   scenarios/

-   package.json

## 13. TECONOLOGÍAS

### Backend
-   NestJS
-   WebSockets(Socket.io)

### Frontend
-   React
-   Vite
-   Zustand

### Engine
-   TypeScript

### Validación
-   Zod

### Combate
-   Phaser(Canvas)

## 14. WORKSPACES (pnpm)

### package.json (root)
```
JSON
{
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ]
}
```

### pnpm-workspace.yaml
```
YAML
packages:
  - "apps/*"
  - "packages/*"
```

## 15. FLUJO DE ACCIÓN

Acción
-> efectos -> actualizaciones de estado -> transición -> render

## 16. EXTENSIBILIDAD

Añadir nueva mecánica:
1. Nuevo tipo en JSON
2. Nuevo handler en system

## 17. TESTING

Prioridades:
-   condiciones
-   efectos
-   transiciones
-   tiradas

## 18. ERRORES A EVITAR

-   lógica en frontend
-   lógica específica por escenario (código)
-   acoplar render con engine
-   JSON sin validación
-   scope excesivo inicial

## 19. ROADMAP DE IMPLEMENTACIÓN

1. Engine narrativo básico
2. JSON + condiciones
3. Backend integración
4. WebSockets
5. Frontend básico
6. Multiplayer
7. Combat engine
8. Renderer táctico
9. IA

## 20. REGLA FUNDAMENTAL

Si necesitas escribir código para un escenario -> el motor está mal diseñado

## 21. DEFINICIÓN FINAL

Sistema modular donde un motor genérico interpreta escenarios declarativos, ejecuta lógica de juego en backend y sincroniza estado en tiempo real para múltiples clientes desacoplados.
