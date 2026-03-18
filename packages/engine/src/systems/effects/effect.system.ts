import { Effect, GameState } from "@coc/types"

export function applyEffect(effect: Effect, state: GameState) {
    switch (effect.type) {
        case "add_flag":
            return {
                ...state,
                flags: {
                    ...state.flags,
                    [effect.flag]: true
                }
            }
        default:
            return state
    }
}