import { Scenario, GameState, RollResult } from "@coc/types"
import { applyEffect } from "../effects/effect.system"
import { evaluateCondition } from "../condition/condition.system"
import { resolveSkillCheck } from "../dice/dice.system"

export function resolveAction(
    scenario: Scenario,
    state: GameState,
    actionId: string,
    characterId: string
): GameState {
    const scene = scenario.scenes.find(
        s => s.id === state.currentSceneId
    )

    if (!scene) throw new Error("Scene not found: ${state.currentSceneId}")

    const action = scene.actions.find(a => a.id === actionId)

    if (!action) throw new Error("Action not found ${actionId}")

    //Skill roll checks
    let rollResult: RollResult | undefined

    if (action.skillCheck) {
        rollResult = resolveSkillCheck(
            state,
            characterId,
            action.skillCheck.skill,
            action.skillCheck.difficulty
        )
    }

    //Save result in state
    state = {
        ...state,
        lastRoll: rollResult
    }
    
    // Apply effects
    if (action.effects) {
        for (const effect of action.effects) {
            state = applyEffect(effect, state)
        }
    }

    // Resolve transition
    if (action.next) {
        for (const next of action.next) {
            if (!next.condition || evaluateCondition(next.condition, state)) {
                state = {
                    ...state,
                    currentSceneId: next.sceneId
                }
                break
            }
        }
    }

    return state
}