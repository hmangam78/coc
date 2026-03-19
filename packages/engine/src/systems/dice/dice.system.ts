import type { GameState, RollResult } from "@coc/types"

export type D100Roller = () => number

export const defaultD100Roller: D100Roller = () =>
    Math.floor(Math.random() * 100) + 1

export function resolveSkillCheck(
    state: GameState,
    characterId: string,
    skill: string,
    difficulty: "normal" | "hard" | "extreme" = "normal",
    d100Roller: D100Roller = defaultD100Roller
): RollResult {
    const roll = rollD100(d100Roller)

    const character = state.characters[characterId]
    if (!character) {
        throw new Error(`Character not found ${characterId}`)
    }

    const skillValue = character.skills[skill] ?? character.attributes?.[skill] ?? 0

    let threshold = skillValue

    if (difficulty == "hard") threshold = Math.floor(skillValue / 2)
    if (difficulty == "extreme") threshold = Math.floor(skillValue / 5)

    const success = roll <= threshold

    return {
        roll,
        success,
        critical: roll === 1,
        fumble: roll >= 96,
        skill,
        threshold
    }
}

export function rollD100(d100Roller: D100Roller = defaultD100Roller): number {
    return d100Roller()
}
