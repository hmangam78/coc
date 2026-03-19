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

function baseCharacter() {
  return {
    id: "c1",
    name: "Test Char",
    attributes: { str: 50, pow: 50 },
    skills: { listen: 50, spot_hidden: 50, occult: 50 },
    inventory: []
  }
}

test("skillCheck success -> roll_success transition emits roll_performed + scene_changed", () => {
  const scenario = {
    characters: [baseCharacter()],
    scenes: [
      {
        id: "start",
        actions: [
          {
            id: "check",
            skillCheck: { skill: "listen", difficulty: "normal" },
            next: [
              { condition: { type: "roll_success" }, sceneId: "ok" },
              { condition: { type: "roll_failure" }, sceneId: "bad" }
            ]
          }
        ]
      },
      { id: "ok", actions: [] },
      { id: "bad", actions: [] }
    ]
  }

  const engine = new GameEngine(scenario, { d100Roller: makeSeqRoller([1]) })

  const result = engine.dispatch("check", "c1")

  assert.equal(engine.getSceneView("c1").id, "ok")
  assert.equal(result.state.lastRollByCharacterId.c1.success, true)

  const types = result.events.map((e) => e.type)
  assert.ok(types.includes("roll_performed"))
  assert.ok(types.includes("scene_changed"))
  assert.ok(types.includes("action_resolved"))
})

test("skillCheck failure -> roll_failure transition", () => {
  const scenario = {
    characters: [baseCharacter()],
    scenes: [
      {
        id: "start",
        actions: [
          {
            id: "check",
            skillCheck: { skill: "listen", difficulty: "normal" },
            next: [
              { condition: { type: "roll_success" }, sceneId: "ok" },
              { condition: { type: "roll_failure" }, sceneId: "bad" }
            ]
          }
        ]
      },
      { id: "ok", actions: [] },
      { id: "bad", actions: [] }
    ]
  }

  const engine = new GameEngine(scenario, { d100Roller: makeSeqRoller([100]) })

  const result = engine.dispatch("check", "c1")

  assert.equal(engine.getSceneView("c1").id, "bad")
  assert.equal(result.state.lastRollByCharacterId.c1.success, false)
})

test("add_flag effect + flag condition transition", () => {
  const scenario = {
    characters: [baseCharacter()],
    scenes: [
      {
        id: "start",
        actions: [
          {
            id: "take_key",
            effects: [{ type: "add_flag", flag: "found_key" }],
            next: [{ sceneId: "door" }]
          }
        ]
      },
      {
        id: "door",
        actions: [
          {
            id: "open",
            next: [
              {
                condition: { type: "flag", flag: "found_key", value: true },
                sceneId: "open_ok"
              },
              { sceneId: "locked" }
            ]
          }
        ]
      },
      { id: "open_ok", actions: [] },
      { id: "locked", actions: [] }
    ]
  }

  const engine = new GameEngine(scenario)

  const r1 = engine.dispatch("take_key", "c1")
  assert.equal(r1.state.flags.found_key, true)
  assert.ok(r1.events.some((e) => e.type === "effect_applied"))
  assert.equal(engine.getSceneView("c1").id, "door")

  engine.dispatch("open", "c1")
  assert.equal(engine.getSceneView("c1").id, "open_ok")
})

test("narration events include action.text and next.text (in order)", () => {
  const scenario = {
    characters: [baseCharacter()],
    scenes: [
      {
        id: "start",
        actions: [
          {
            id: "go",
            text: "You act.",
            next: [{ sceneId: "next", text: "You arrive." }]
          }
        ]
      },
      { id: "next", actions: [] }
    ]
  }

  const engine = new GameEngine(scenario)
  const result = engine.dispatch("go", "c1")

  const narration = result.events
    .filter((e) => e.type === "narration")
    .map((e) => e.text)

  assert.deepEqual(narration, ["You act.", "You arrive."])
})

