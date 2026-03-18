export type GameState = {
    currentSceneId: string
    flags: Record<string, boolean>
    characters: Record<string, Character>
    lastRoll?: RollResult
}

export type Character = {
    id: string
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

