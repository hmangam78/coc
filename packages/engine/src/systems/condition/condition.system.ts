import { Condition, GameState } from "@coc/types"

export function evaluateCondition(
    condition: Condition,
    state: GameState
): boolean {
    switch (condition.type) {
        case "flag":
            return state.flags[condition.flag] === condition.value

        case "roll_success":
            return state.lastRoll?.success === true
        
        case "roll_failure":
            return state.lastRoll?.success === false
        
        default:
            return false
    }
}