import { Scenario, GameState, DispatchResult } from "@coc/types"
import { createInitialState } from "./state"
import { resolveAction } from "./systems/narrative/narrative.system"

export class GameEngine {
    private state: GameState
    private scenario: Scenario

    constructor(scenario: Scenario) {
        this.scenario = scenario
        this.state = createInitialState(scenario)
    }

    getState() {
        return this.state
    }

    dispatch(actionId: string, characterId: string): DispatchResult {
        const result = resolveAction(this.scenario, this.state, actionId, characterId)
        this.state = result.state
        return result
    }
    
    getSceneView(characterId: string) {
        const sceneId = this.state.sceneByCharacterId[characterId]
        if (!sceneId) throw new Error(`Scene cursor not found for character: ${characterId}`)

        const scene = this.scenario.scenes.find(
            s => s.id === sceneId
        )

        if (!scene) throw new Error("Scene not found")

        return {
            id: scene.id,
            actions: scene.actions.map(a => ({
                id: a.id,
                label: a.id
            }))
        }
    }

}
