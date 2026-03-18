export type GameState = {
    sceneByCharacterId: Record<string, string>
    flags: Record<string, boolean>
    characters: Record<string, Character>
    lastRollByCharacterId: Record<string, RollResult | undefined>
}

export type Character = {
    id: string
    name?: string
    attributes?: Record<string, number>
    skills: Record<string, number>
    inventory?: string[]
}

export type SkillName = string

export type SkillCheck = {
    skill: SkillName
    difficulty?: "normal" | "hard" | "extreme"
}

export type RollResult = {
    roll: number
    success: boolean
    critical: boolean
    fumble: boolean
    skill: string
    threshold: number
}
