import type { GameState, Scenario } from "@coc/types"

export function createInitialState(scenario: Scenario): GameState {
    const characters = Object.fromEntries(
        scenario.characters.map((c) => [c.id, c])
    )

    const initialSceneId = scenario.scenes[0]?.id
    if (!initialSceneId) {
        throw new Error("Scenario has no scenes")
    }

    const sceneByCharacterId = Object.fromEntries(
        scenario.characters.map((c) => [c.id, initialSceneId])
    )

    return {
        sceneByCharacterId,
        flags: {},
        vars: {},
        characters,
        lastRollByCharacterId: {}
    }
}
