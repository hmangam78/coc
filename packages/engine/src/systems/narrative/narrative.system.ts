import type { Scenario, GameState, RollResult, DispatchResult, GameEvent } from "@coc/types"
import { applyEffect } from "../effects/effect.system"
import { evaluateCondition } from "../condition/condition.system"
import { resolveSkillCheck } from "../dice/dice.system"

export function resolveAction(
    scenario: Scenario,
    state: GameState,
    actionId: string,
    characterId: string
): DispatchResult {
    const events: GameEvent[] = []
    const currentSceneId = state.sceneByCharacterId[characterId]
    if (!currentSceneId) {
        throw new Error(`Scene cursor not found for character: ${characterId}`)
    }

    const scene = scenario.scenes.find(s => s.id === currentSceneId)

    if (!scene) throw new Error(`Scene not found: ${currentSceneId}`)

    const action = scene.actions.find(a => a.id === actionId)

    if (!action) throw new Error(`Action not found: ${actionId}`)

    const fromSceneId = currentSceneId

    if (action.text) {
        events.push({ type: "narration", text: action.text })
    }

    //Skill roll checks
    let rollResult: RollResult | undefined

    if (action.skillCheck) {
        const difficulty = action.skillCheck.difficulty ?? "normal"
        rollResult = resolveSkillCheck(
            state,
            characterId,
            action.skillCheck.skill,
            difficulty
        )

        events.push({
            type: "roll_performed",
            characterId,
            skill: action.skillCheck.skill,
            difficulty,
            result: rollResult
        })
    }

    //Save result in state
    state = {
        ...state,
        lastRollByCharacterId: {
            ...state.lastRollByCharacterId,
            [characterId]: rollResult
        }
    }
    
    // Apply effects
    if (action.effects) {
        for (const effect of action.effects) {
            state = applyEffect(effect, state)
            events.push({ type: "effect_applied", effect })
        }
    }

    // Resolve transition
    if (action.next) {
        for (const next of action.next) {
            if (!next.condition || evaluateCondition(next.condition, state, characterId)) {
                state = {
                    ...state,
                    sceneByCharacterId: {
                        ...state.sceneByCharacterId,
                        [characterId]: next.sceneId
                    }
                }

                if (next.text) {
                    events.push({ type: "narration", text: next.text })
                }
                break
            }
        }
    }

    const toSceneId = state.sceneByCharacterId[characterId]
    if (!toSceneId) {
        throw new Error(`Scene cursor not found for character: ${characterId}`)
    }
    if (toSceneId !== fromSceneId) {
        events.push({
            type: "scene_changed",
            fromSceneId,
            toSceneId,
            actionId
        })
    }

    events.push({
        type: "action_resolved",
        actionId,
        characterId,
        sceneId: fromSceneId
    })

    return { state, events }
}
