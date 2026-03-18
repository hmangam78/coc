import { Scenario, GameState } from "@coc/types"
import { applyEffect } from "./effect.system"
import { evaluateCondition } from "./condition.system"

export function resolveAction(
    scenario: Scenario,
    state: GameState,
    actionId: string
): GameState {
    const scene = scenario.scenes.find(
        s => s.id === state.currentSceneId
    )

    if (!scene) throw new Error("Scene not found: ${state.currentSceneId}")

    const action = scene.actions.find(a => a.id === actionId)

    if (!action) throw new Error("Action not found")
    
    // Apply effects
    action.effects?.forEach(effect => applyEffect(effect, state))

    // Resolve transition
    if (action.next) {
        for (const next of action.next) {
            if (!next.condition || evaluateCondition(next.condition, state)) {
                state.currentSceneId = next.sceneId
                break
            }
        }
    }

    return state
}