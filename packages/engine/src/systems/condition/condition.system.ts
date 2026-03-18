import { Condition, GameState } from "@coc/types"

export function evaluateCondition(
    condition: Condition,
    state: GameState,
    characterId: string
): boolean {
    switch (condition.type) {
        case "flag":
            return state.flags[condition.flag] === condition.value

        case "roll_success":
            return state.lastRollByCharacterId[characterId]?.success === true
        
        case "roll_failure":
            return state.lastRollByCharacterId[characterId]?.success === false
        
        default:
            return false
    }
}
