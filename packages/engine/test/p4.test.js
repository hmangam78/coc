const test = require("node:test")
const assert = require("node:assert/strict")

const { GameEngine } = require("../dist/index.js")

function makeSeqRoller(values) {
  let idx = 0
  return () => {
    if (idx >= values.length) {
      throw new Error("d100Roller sequence exhausted")
    }
    const v = values[idx++]
    if (!Number.isInteger(v) || v < 1 || v > 100) {
      throw new Error(`Invalid d100 roll value: ${v}`)
    }
    return v
  }
}

function makeScenario() {
  return {
    characters: [
      {
        id: "c1",
        attributes: {},
        skills: { listen: 50 },
        inventory: []
      }
    ],
    globalActions: [
      {
        id: "study_book",
        label: "Estudiar el libro",
        availableWhen: [
          { type: "has_item", item: "book", value: true },
          { type: "flag", flag: "know_what_to_look_for", value: true }
        ],
        text: "Revisas el libro con una nueva mirada.",
        effects: [{ type: "add_flag", flag: "book_clue_found" }]
      }
    ],
    scenes: [
      {
        id: "room",
        actions: [
          {
            id: "take_book",
            label: "Coger el libro",
            availableWhen: [{ type: "flag", flag: "took_book", value: false }],
            effects: [
              { type: "add_item", item: "book" },
              { type: "add_flag", flag: "took_book" }
            ]
          },
          {
            id: "inspect_painting",
            label: "Examinar el cuadro",
            availableWhen: [{ type: "flag", flag: "painting_done", value: false }],
            text: "Encuentras una anotación útil.",
            effects: [
              { type: "add_flag", flag: "painting_done" },
              { type: "add_flag", flag: "know_what_to_look_for" }
            ]
          },
          {
            id: "wait",
            label: "Esperar",
            effects: [{ type: "inc_var", name: "time", delta: 1 }],
            next: [{ sceneId: "room" }]
          },
          {
            id: "roll_listen",
            label: "Escuchar",
            skillCheck: { skill: "listen", difficulty: "normal" },
            next: [
              { condition: { type: "roll_success" }, sceneId: "room" },
              { condition: { type: "roll_failure" }, sceneId: "room" }
            ]
          }
        ]
      }
    ]
  }
}

test("availableWhen hides actions and globalActions until conditions satisfied", () => {
  const engine = new GameEngine(makeScenario())

  // At start, global action hidden and room actions visible.
  const view1 = engine.getSceneView("c1")
  const ids1 = view1.actions.map((a) => a.id)
  assert.ok(ids1.includes("take_book"))
  assert.ok(ids1.includes("inspect_painting"))
  assert.ok(!ids1.includes("study_book"))

  // Take book: should hide take_book after setting the flag.
  engine.dispatch("take_book", "c1")
  const view2 = engine.getSceneView("c1")
  const ids2 = view2.actions.map((a) => a.id)
  assert.ok(!ids2.includes("take_book"))
  assert.ok(!ids2.includes("study_book"))

  // Discover clue: now global action appears.
  engine.dispatch("inspect_painting", "c1")
  const view3 = engine.getSceneView("c1")
  const ids3 = view3.actions.map((a) => a.id)
  assert.ok(ids3.includes("study_book"))
})

test("vars default to 0 and inc_var updates state.vars", () => {
  const engine = new GameEngine(makeScenario())

  assert.equal(engine.getState().vars.time, undefined)
  engine.dispatch("wait", "c1")
  assert.equal(engine.getState().vars.time, 1)
  engine.dispatch("wait", "c1")
  assert.equal(engine.getState().vars.time, 2)
})

test("has_item condition becomes true after add_item", () => {
  const engine = new GameEngine(makeScenario())

  engine.dispatch("take_book", "c1")
  const character = engine.getState().characters.c1
  assert.ok(character.inventory.includes("book"))
})

test("roll uses injected d100Roller", () => {
  const engine = new GameEngine(makeScenario(), { d100Roller: makeSeqRoller([1]) })
  const result = engine.dispatch("roll_listen", "c1")

  assert.ok(result.events.some((e) => e.type === "roll_performed"))
  assert.equal(result.state.lastRollByCharacterId.c1.roll, 1)
})

