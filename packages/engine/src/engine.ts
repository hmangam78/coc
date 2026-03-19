import type { Scenario, GameState, DispatchResult, Condition } from "@coc/types"
import { createInitialState } from "./state"
import { resolveAction } from "./systems/narrative/narrative.system"
import { defaultD100Roller } from "./systems/dice/dice.system"
import type { D100Roller } from "./systems/dice/dice.system"
import { evaluateCondition } from "./systems/condition/condition.system"

export type GameEngineOptions = {
    d100Roller?: D100Roller
}

export class GameEngine {
    private state: GameState
    private scenario: Scenario
    private d100Roller: D100Roller

    constructor(scenario: Scenario, options: GameEngineOptions = {}) {
        this.scenario = scenario
        this.state = createInitialState(scenario)
        this.d100Roller = options.d100Roller ?? defaultD100Roller
    }

    getState() {
        return this.state
    }

    dispatch(actionId: string, characterId: string): DispatchResult {
        const result = resolveAction(
            this.scenario,
            this.state,
            actionId,
            characterId,
            this.d100Roller
        )
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

        const isAvailable = (action: { availableWhen?: Condition[] }) => {
            if (!action.availableWhen || action.availableWhen.length === 0) return true
            return action.availableWhen.every(c => evaluateCondition(c, this.state, characterId))
        }

        const actions = [
            ...scene.actions.filter(isAvailable),
            ...(this.scenario.globalActions ?? []).filter(isAvailable)
        ]

        return {
            id: scene.id,
            text: scene.text,
            actions: actions.map(a => ({
                id: a.id,
                label: a.label ?? a.id
            }))
        }
    }

}
