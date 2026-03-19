import type { Condition, GameState } from "@coc/types"

export function evaluateCondition(
    condition: Condition,
    state: GameState,
    characterId: string
): boolean {
    switch (condition.type) {
        case "flag":
            return (state.flags[condition.flag] ?? false) === condition.value

        case "has_item": {
            const character = state.characters[characterId]
            if (!character) return false
            const inventory = character.inventory ?? []
            const has = inventory.includes(condition.item)
            return has === condition.value
        }

        case "var": {
            const current = state.vars[condition.name] ?? 0
            const target = condition.value
            switch (condition.op) {
                case "==":
                    return current === target
                case "!=":
                    return current !== target
                case ">=":
                    return current >= target
                case "<=":
                    return current <= target
                case ">":
                    return current > target
                case "<":
                    return current < target
                default:
                    return false
            }
        }

        case "roll_success":
            return state.lastRollByCharacterId[characterId]?.success === true
        
        case "roll_failure":
            return state.lastRollByCharacterId[characterId]?.success === false
        
        default:
            return false
    }
}
