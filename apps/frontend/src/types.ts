export type GameState = {
    sceneId: string
    flags: Record<string, boolean>
    character: {
        id: string
        name?: string
        attributes?: Record<string, number>
        skills: Record<string, number>
        inventory?: string[]
    }
    lastRoll?: {
        roll: number
        success: boolean
        critical: boolean
        fumble: boolean
        skill: string
        threshold: number
    }
    players: {
        playerId: string
        characterId?: string
        connected: boolean
    }[]
}
export type SceneView = {
    id: string
    text?: string
    actions: {
        id: string
        label: string
    }[]
}

export type View = {
    scene: SceneView
    state: GameState
}
