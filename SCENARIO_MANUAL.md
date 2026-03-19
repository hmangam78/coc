# Manual de creación de escenarios (partidas personalizadas)

Este proyecto ejecuta escenarios declarativos en JSON: tú describes **escenas** y **acciones**, y el motor resuelve tiradas, aplica efectos y mueve al jugador por el grafo de escenas.

El objetivo de este manual es que puedas crear un escenario completo sin tocar código.

---

## 1) Dónde colocar el archivo y cómo se carga

1. Crea un JSON en la carpeta `scenarios/`, por ejemplo `scenarios/mi_aventura.json`.
2. El `scenarioId` es el nombre del archivo **sin** `.json` (`mi_aventura`).
3. El backend lista y valida escenarios:
   - `GET /game/scenarios` → verás si tu escenario es válido o el error.
4. Para jugarlo, crea sesión con ese `scenarioId`:
   - `POST /game/session` con `{ "scenarioId": "mi_aventura" }`
5. En la UI de debug, aparecerá un botón `Create: mi_aventura` si es válido.

Restricciones de nombre (`scenarioId`):
- solo letras, números, `_` y `-`.

---

## 2) Estructura general del escenario (`Scenario`)

Un escenario tiene:

- `characters`: lista de personajes jugables (al hacer join se asigna uno libre).
- `scenes`: lista de escenas (nodos).
- `globalActions` (opcional): acciones “disponibles en cualquier momento” (se mezclan con las de la escena actual).

### Esquema mental

- Estás en una escena (p. ej. `study_room`).
- La escena muestra una lista de acciones disponibles.
- El jugador elige una acción:
  1) (opcional) se hace una tirada,
  2) se aplican efectos (flags, variables, inventario),
  3) se elige una transición (`next`) y se cambia de escena (o no),
  4) se emiten eventos (`narration`, `roll_performed`, etc.) para el cliente.

---

## 3) Personajes (`characters[]`)

Cada personaje define sus números de tirada e inventario.

```json
{
  "id": "investigator_1",
  "name": "Detective Ruiz",
  "attributes": { "str": 55, "pow": 60, "edu": 75 },
  "skills": { "listen": 55, "spot_hidden": 60, "occult": 25 },
  "inventory": []
}
```

Campos:
- `id` (string, requerido): identificador único del personaje.
- `name` (string, opcional): nombre.
- `attributes` (objeto string→number, opcional): “stats” (STR/POW/etc.). También se pueden usar en tiradas.
- `skills` (objeto string→number, requerido): habilidades.
- `inventory` (string[], opcional): inventario inicial (si no lo pones, se asume vacío).

Notas importantes:
- Una tirada (`skillCheck.skill`) busca primero en `skills`, y si no existe, en `attributes`. Si no existe en ninguno, vale `0` (casi siempre fallará).

---

## 4) Escenas (`scenes[]`)

Una escena es un lugar/situación actual del personaje.

```json
{
  "id": "study_room",
  "text": "Una sala de estudio...",
  "actions": [ /* acciones */ ]
}
```

Campos:
- `id` (string, requerido): id único de escena.
- `text` (string, opcional): texto “ambiental” que se muestra al entrar/ver la escena.
- `actions` (Action[], requerido): lista de acciones disponibles (filtradas por condiciones).

Reglas:
- El motor arranca en la **primera escena** del array `scenes[0]` para cada personaje.
- Una escena terminal se expresa con `actions: []`.

---

## 5) Acciones (`Action`)

Una acción es lo que el jugador decide hacer: investigar, hablar, huir, forzar una puerta, leer, etc.

```json
{
  "id": "inspect_painting",
  "label": "Examinar el cuadro",
  "text": "Detrás del marco encuentras una anotación...",
  "availableWhen": [
    { "type": "flag", "flag": "painting_done", "value": false }
  ],
  "skillCheck": { "skill": "spot_hidden", "difficulty": "normal" },
  "effects": [
    { "type": "set_flag", "flag": "painting_done", "value": true },
    { "type": "inc_var", "name": "clues", "delta": 1 }
  ],
  "next": [
    { "sceneId": "study_room" }
  ]
}
```

Campos:
- `id` (string, requerido): identificador de acción.
- `label` (string, opcional): texto del botón. Si no existe, se usa el `id`.
- `text` (string, opcional): narración emitida al resolver la acción.
- `availableWhen` (Condition[], opcional): condiciones para que la acción exista en la lista.
  - Si NO se cumple, la acción se **oculta** (no se muestra).
  - Todas deben cumplirse (AND).
- `skillCheck` (opcional): define una tirada d100.
- `effects` (Effect[], opcional): cambios de estado (flags/vars/inventario).
- `next` (Transition[], opcional): transiciones posibles (la primera que cumpla condición se toma).

### Acciones de decisión pura
Una acción sin `skillCheck` es una elección del jugador sin tirada.

### Permanecer en la misma escena (“investigar varias cosas”)
Para investigar cosas sin moverte:
- no pongas `next` (te quedas),
- o pon `next: [{ "sceneId": "misma_escena" }]`.

Recomendación práctica:
- si quieres emitir un texto distinto al “permanecer”, usa `next.text` y `next.sceneId` a la misma escena.

---

## 6) Tiradas (`skillCheck`)

```json
{ "skill": "listen", "difficulty": "hard" }
```

- `skill` (string): nombre de skill/attribute.
- `difficulty` (opcional): `"normal"` | `"hard"` | `"extreme"`.
  - si no se pone, es `"normal"`.

Reglas del motor:
- Se tira 1d100.
- Umbral:
  - normal: `skillValue`
  - hard: `floor(skillValue / 2)`
  - extreme: `floor(skillValue / 5)`
- Éxito: `roll <= threshold`
- Crítico: `roll == 1`
- Pifia: `roll >= 96` (regla simplificada)

El resultado se guarda en `lastRollByCharacterId[characterId]` y se usa en condiciones `roll_success`/`roll_failure`.

---

## 7) Transiciones (`next[]`)

Cada acción puede tener varias transiciones. El motor evalúa en orden y elige la primera que cumpla.

```json
"next": [
  {
    "condition": { "type": "roll_success" },
    "sceneId": "ok",
    "text": "Lo consigues."
  },
  {
    "condition": { "type": "roll_failure" },
    "sceneId": "bad",
    "text": "Fallas."
  },
  {
    "sceneId": "fallback",
    "text": "Si nada aplica, caes aquí."
  }
]
```

Campos:
- `sceneId` (string, requerido): escena destino.
- `condition` (Condition, opcional): condición para tomar esta rama.
- `text` (string, opcional): narración emitida si esta transición se toma.

Consejo:
- incluye siempre una rama sin `condition` como “fallback” cuando uses condiciones, para evitar quedar sin transición.

---

## 8) Condiciones (`Condition`)

Las condiciones se usan en:
- `availableWhen` (para ocultar acciones),
- `next[].condition` (para ramificar).

### 8.1 `flag`
Comprueba un flag booleano global.

```json
{ "type": "flag", "flag": "found_key", "value": true }
```

Importante:
- si el flag no existe, se considera `false`.

### 8.2 `roll_success` / `roll_failure`
Dependen de la **última tirada del personaje**.

```json
{ "type": "roll_success" }
```

Nota:
- si no ha habido tirada todavía, ambas suelen evaluarse como `false`.

### 8.3 `has_item`
Comprueba si el personaje tiene (o no) un objeto en inventario.

```json
{ "type": "has_item", "item": "mysterious_book", "value": true }
```

### 8.4 `var`
Comparación numérica contra una variable global (`state.vars[name]`).

```json
{ "type": "var", "name": "clues", "op": ">=", "value": 2 }
```

Operadores (`op`):
- `"=="`, `"!="`, `">="`, `"<="`, `">"`, `"<"`

Importante:
- si la variable no existe, se considera `0`.

---

## 9) Efectos (`Effect`)

Los efectos se aplican al resolver una acción (antes de elegir `next`).

### 9.1 Flags

```json
{ "type": "add_flag", "flag": "found_key" }
{ "type": "set_flag", "flag": "door_open", "value": true }
{ "type": "remove_flag", "flag": "temporary" }
```

Recomendación:
- usa `set_flag` si quieres poder poner `false`.
- usa `add_flag` para “marcadores” de una sola dirección.

### 9.2 Variables numéricas (`vars`)

```json
{ "type": "set_var", "name": "clues", "value": 0 }
{ "type": "inc_var", "name": "clues", "delta": 1 }
{ "type": "inc_var", "name": "time", "delta": 5 }
```

Variables típicas:
- `clues`, `time`, `danger`, `stress`, `suspicion`, etc.

### 9.3 Inventario (por personaje)

```json
{ "type": "add_item", "item": "mysterious_book" }
{ "type": "remove_item", "item": "mysterious_book" }
```

Notas:
- `add_item` no duplica el objeto si ya existe.
- `remove_item` no falla si no existe (simplemente no cambia nada).

---

## 10) Acciones globales (`globalActions`)

Sirven para modelar cosas “que puedes hacer en cualquier momento”, como:
- leer un libro cuando haya calma,
- revisar notas tras descubrir una pista,
- curarte, descansar, rezar, etc.

Se definen igual que una acción normal:

```json
"globalActions": [
  {
    "id": "study_book",
    "label": "Estudiar el libro",
    "availableWhen": [
      { "type": "has_item", "item": "mysterious_book", "value": true },
      { "type": "flag", "flag": "know_what_to_look_for", "value": true }
    ],
    "effects": [{ "type": "inc_var", "name": "clues", "delta": 1 }]
  }
]
```

Reglas:
- se mezclan con las acciones de la escena actual (por ahora, sin UI separada).
- se filtran por `availableWhen` igual que las de escena (ocultas si no aplican).

Recomendación fuerte:
- usa `availableWhen` para que no se conviertan en “menú infinito” siempre visible.

---

## 11) Patrones útiles (recetas)

### A) Acción “solo una vez” (oculta al completarla)

1. En `availableWhen`, exige que un flag sea `false`.
2. En efectos, pon ese flag a `true`.

```json
{
  "id": "inspect_painting",
  "availableWhen": [{ "type": "flag", "flag": "painting_done", "value": false }],
  "effects": [{ "type": "set_flag", "flag": "painting_done", "value": true }]
}
```

### B) Explorar una sala (varios objetos, misma escena)

Cada acción investiga algo y vuelve a `study_room` (o no transiciona).

### C) “No puedes entenderlo todavía” (conocimiento diferido)

- Cuando obtienes el objeto: `add_item(book)`, pero la acción global `study_book` no aparece.
- Cuando aprendes algo: `set_flag(know_what_to_look_for,true)`.
- Entonces aparece `study_book` y desbloquea una pista.

### D) Salida por umbral (pistas suficientes)

```json
{
  "id": "leave_room",
  "next": [
    { "condition": { "type": "var", "name": "clues", "op": ">=", "value": 2 }, "sceneId": "hall_with_clues" },
    { "sceneId": "hall_no_clues" }
  ]
}
```

---

## 12) Ejemplo real listo para jugar

El repo incluye un escenario pensado exactamente para probar estas mecánicas:

- `scenarios/p4_mechanics.json`

Recomendación de prueba:
1) Coge el libro (pero no lo estudies).
2) Examina el cuadro (te da el “conocimiento”).
3) Observa que aparece la acción global “Estudiar el libro”.
4) Investiga huellas/escritorio para subir `clues` y prueba la salida por `clues >= 2`.

---

## 13) Limitaciones actuales (para que no te sorprendan)

- `availableWhen` es AND (no hay OR directo).
  - Puedes simular OR con varias acciones, o con flags/vars intermedias.
- `flags` y `vars` son globales (compartidas por todos); el inventario es por personaje.
- No hay “variables por personaje” todavía (si las necesitas, se puede diseñar como mecánica nueva).

