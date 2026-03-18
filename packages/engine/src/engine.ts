import { Scenario, GameState } from "@coc/types"
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

    dispatch(actionId: string, characterId: string) {
        this.state = resolveAction(this.scenario, this.state, actionId, characterId)
        return this.state
    }
}