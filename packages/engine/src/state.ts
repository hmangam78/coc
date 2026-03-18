import { GameState, Scenario } from "@coc/types"

export function createInitialState(scenario: Scenario): GameState {
    const characters = Object.fromEntries(
        scenario.characters.map((c) => [c.id, c])
    )

    return {
        currentSceneId: scenario.scenes[0].id,
        flags: {},
        characters
    }
}