import type { Character, GameEvent, GameState, RollResult } from "@coc/types"

export type CreateSessionRequestV1 = {
    scenarioId?: string
}

export type CreateSessionResponseV1 = {
    sessionId: string
}

export type ScenarioListItemV1 = {
    id: string
    valid: boolean
    error?: string
}

export type ListScenariosResponseV1 = {
    scenarios: ScenarioListItemV1[]
}

export type JoinRestResponseV1 = {
    playerId: string
    playerToken: string
    characterId: string
}

export type ActionRestRequestV1 = {
    playerToken: string
    actionId: string
}

/**
 * Compat v1: hoy devolvemos el estado interno del engine en el ack.
 * Recomendación futura: cambiar a ack liviano y depender de `state_update`.
 */
export type ActionAckV1 = GameState
export type ActionRestResponseV1 = GameState

export type ActionAckV2 = {
    accepted: true
}

export type JoinRequestV1 = {
    sessionId: string
    playerToken?: string
}

export type ActionRequestV1 = {
    sessionId: string
    actionId: string
    playerToken: string
}

export type SceneViewV1 = {
    id: string
    text?: string
    actions: {
        id: string
        label: string
    }[]
}

export type VisibleGameStateV1 = {
    sceneId: string
    flags: Record<string, boolean>
    character: Character
    lastRoll?: RollResult
    players: {
        playerId: string
        characterId?: string
        connected: boolean
    }[]
}

export type StateUpdateV1 = {
    scene: SceneViewV1
    state: VisibleGameStateV1
}

export type JoinResponseV1 = JoinRestResponseV1 & StateUpdateV1

export type EventsEnvelopeV1 = {
    playerId: string
    characterId: string
    events: GameEvent[]
    ts?: number
    seq?: number
}

export type ActionRestResponseV2 = {
    stateUpdate: StateUpdateV1
    events: EventsEnvelopeV1
}
