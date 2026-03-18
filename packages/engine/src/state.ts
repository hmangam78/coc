import { GameState, Scenario } from "@coc/types"

export function createInitialState(scenario: Scenario): GameState {
    return {
        currentSceneId: scenario.scenes[0].id,
        flags: {}
    }
}