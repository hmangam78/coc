import type { Effect, GameState } from "@coc/types"

export function applyEffect(effect: Effect, state: GameState, characterId: string) {
    switch (effect.type) {
        case "add_flag":
            return {
                ...state,
                flags: {
                    ...state.flags,
                    [effect.flag]: true
                }
            }
        case "set_flag":
            return {
                ...state,
                flags: {
                    ...state.flags,
                    [effect.flag]: effect.value
                }
            }
        case "remove_flag": {
            const { [effect.flag]: _, ...rest } = state.flags
            return {
                ...state,
                flags: rest
            }
        }
        case "set_var":
            return {
                ...state,
                vars: {
                    ...state.vars,
                    [effect.name]: effect.value
                }
            }
        case "inc_var":
            return {
                ...state,
                vars: {
                    ...state.vars,
                    [effect.name]: (state.vars[effect.name] ?? 0) + effect.delta
                }
            }
        case "add_item": {
            const character = state.characters[characterId]
            if (!character) return state
            const inventory = character.inventory ?? []
            if (inventory.includes(effect.item)) return state
            return {
                ...state,
                characters: {
                    ...state.characters,
                    [characterId]: {
                        ...character,
                        inventory: [...inventory, effect.item]
                    }
                }
            }
        }
        case "remove_item": {
            const character = state.characters[characterId]
            if (!character) return state
            const inventory = character.inventory ?? []
            if (!inventory.includes(effect.item)) return state
            return {
                ...state,
                characters: {
                    ...state.characters,
                    [characterId]: {
                        ...character,
                        inventory: inventory.filter(i => i !== effect.item)
                    }
                }
            }
        }
        default:
            return state
    }
}
