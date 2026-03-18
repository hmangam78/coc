import { Injectable } from "@nestjs/common"
import { BadRequestException } from "@nestjs/common"
import { GameEngine } from "@coc/engine"
import type { DispatchResult, GameState } from "@coc/types"
import { v4 as uuid } from "uuid"
import { ScenarioService } from "../scenario/scenario.service"

type Player = {
    id: string
    token: string
    characterId?: string
    socketIds: Set<string>
    createdAt: number
    lastSeenAt: number
}

type Session = {
    id: string,
    scenarioId: string,
    engine: GameEngine,
    players: Map<string, Player>
    playerIdByToken: Map<string, string>
    createdAt: number
    lastActivityAt: number
}

type DispatchWithActor = DispatchResult & {
    playerId: string
    characterId: string
}

@Injectable()
export class GameService {
    private sessions = new Map<string, Session>
    private socketIndex = new Map<string, { sessionId: string; playerId: string }>()
    private cleanupTimer?: NodeJS.Timeout

    constructor(private scenarioService: ScenarioService) {
        const sessionTtlMs = parseMs(process.env.SESSION_TTL_MS, 30 * 60 * 1000)
        const playerTtlMs = parseMs(process.env.PLAYER_TTL_MS, 10 * 60 * 1000)
        const cleanupIntervalMs = parseMs(process.env.SESSION_CLEANUP_INTERVAL_MS, 30 * 1000)

        this.cleanupTimer = setInterval(() => {
            this.cleanupExpiredSessions(sessionTtlMs)
            this.cleanupExpiredPlayers(playerTtlMs)
        }, cleanupIntervalMs)

        this.cleanupTimer.unref?.()
    }

    async createSession(scenarioId = "test"): Promise<string> {
        const sessionId = uuid()

        const scenario = await this.scenarioService.loadScenarioById(scenarioId)

        const session: Session = {
            id: sessionId,
            scenarioId,
            engine: new GameEngine(scenario),
            players: new Map(),
            playerIdByToken: new Map(),
            createdAt: Date.now(),
            lastActivityAt: Date.now()
        }

        this.sessions.set(sessionId, session)

        return sessionId
    }

    getRawState(sessionId: string): GameState {
        const session = this.sessions.get(sessionId)
        if (!session) throw new BadRequestException("Session not found")
        return session.engine.getState()
    }

    /**
     * REST-friendly join: creates a player without binding to any socket.
     */
    createPlayer(sessionId: string) {
        const session = this.sessions.get(sessionId)
        if (!session) throw new BadRequestException("Session not found")

        session.lastActivityAt = Date.now()

        const playerId = uuid()
        const token = uuid()

        const state = session.engine.getState()
        const assignedCharacterIds = new Set(
            [...session.players.values()]
                .map(p => p.characterId)
                .filter(Boolean)
        )

        const availableCharacter = Object.values(state.characters).find(
            c => !assignedCharacterIds.has(c.id)
        )

        if (!availableCharacter) {
            throw new BadRequestException("No available characters")
        }

        const player: Player = {
            id: playerId,
            token,
            characterId: availableCharacter.id,
            socketIds: new Set(),
            createdAt: Date.now(),
            lastSeenAt: Date.now()
        }

        session.players.set(playerId, player)
        session.playerIdByToken.set(token, playerId)

        return { playerId, playerToken: token, characterId: availableCharacter.id }
    }

    joinSession(sessionId: string, socketId: string, playerToken?: string) {
        const session = this.sessions.get(sessionId)
        if (!session) throw new BadRequestException("Session not found")

        session.lastActivityAt = Date.now()

        if (playerToken) {
            const existingPlayerId = session.playerIdByToken.get(playerToken)
            if (!existingPlayerId) {
                throw new BadRequestException("Invalid player token")
            }

            const existingPlayer = session.players.get(existingPlayerId)
            if (!existingPlayer || !existingPlayer.characterId) {
                throw new BadRequestException("Player not found for token")
            }

            existingPlayer.socketIds.add(socketId)
            existingPlayer.lastSeenAt = Date.now()
            this.socketIndex.set(socketId, { sessionId, playerId: existingPlayerId })

            return {
                playerId: existingPlayerId,
                playerToken: existingPlayer.token,
                characterId: existingPlayer.characterId
            }
        }

        const playerId = uuid()
        const token = uuid()

        //Get available characters
        const state = session.engine.getState()

        const assignedCharacterIds = new Set(
            [...session.players.values()]
                .map(p => p.characterId)
                .filter(Boolean)
        )

        const availableCharacter = Object.values(state.characters).find(
            c => !assignedCharacterIds.has(c.id)
        )

        if (!availableCharacter) {
            throw new BadRequestException("No available characters")
        }

        const player: Player = {
            id: playerId,
            token,
            characterId: availableCharacter.id,
            socketIds: new Set([socketId]),
            createdAt: Date.now(),
            lastSeenAt: Date.now()
        }

        session.players.set(playerId, player)
        session.playerIdByToken.set(token, playerId)
        this.socketIndex.set(socketId, { sessionId, playerId })

        return { playerId, playerToken: token, characterId: availableCharacter.id }
    }

    dispatchByToken(sessionId: string, playerToken: string, actionId: string): DispatchWithActor {
        const session = this.sessions.get(sessionId)
        if (!session) throw new BadRequestException("Session not found")

        const playerId = session.playerIdByToken.get(playerToken)
        if (!playerId) throw new BadRequestException("Invalid player token")

        const player = session.players.get(playerId)
        if (!player || !player.characterId) {
            throw new BadRequestException("Player has no character")
        }

        session.lastActivityAt = Date.now()
        player.lastSeenAt = Date.now()

        const result = session.engine.dispatch(actionId, player.characterId)

        return {
            ...result,
            playerId,
            characterId: player.characterId
        }
    }

    disconnectSocket(socketId: string) {
        const idx = this.socketIndex.get(socketId)
        if (!idx) return

        const session = this.sessions.get(idx.sessionId)
        if (!session) {
            this.socketIndex.delete(socketId)
            return
        }

        const player = session.players.get(idx.playerId)
        if (!player) {
            this.socketIndex.delete(socketId)
            return
        }

        player.socketIds.delete(socketId)
        player.lastSeenAt = Date.now()
        this.socketIndex.delete(socketId)
    }

    getViewForPlayer(sessionId: string, playerId: string) {
        const session = this.sessions.get(sessionId)
        if (!session) throw new BadRequestException("Session not found")

        const player = session.players.get(playerId)
        if (!player || !player.characterId) {
            throw new BadRequestException("Player not found")
        }

        const state = session.engine.getState()
        const sceneId = state.sceneByCharacterId[player.characterId]
        if (!sceneId) {
            throw new BadRequestException("Player has no scene cursor")
        }

        const lastRoll = state.lastRollByCharacterId[player.characterId]

        const visibleState = {
            sceneId,
            flags: state.flags,
            character: state.characters[player.characterId],
            lastRoll,
            players: [...session.players.values()].map(p => ({
                playerId: p.id,
                characterId: p.characterId,
                connected: p.socketIds.size > 0
            }))
        }
        
        return {
            scene: session.engine.getSceneView(player.characterId),
            state: visibleState
        }
    }

    getSessionPlayerIds(sessionId: string): string[] {
        const session = this.sessions.get(sessionId)
        if (!session) throw new BadRequestException("Session not found")
        return [...session.players.keys()]
    }

    getPlayerRoom(sessionId: string, playerId: string) {
        return `${sessionId}:${playerId}`
    }

    private cleanupExpiredSessions(sessionTtlMs: number) {
        const now = Date.now()
        for (const [sessionId, session] of this.sessions.entries()) {
            if (now - session.lastActivityAt > sessionTtlMs) {
                this.sessions.delete(sessionId)
                for (const [socketId, idx] of this.socketIndex.entries()) {
                    if (idx.sessionId === sessionId) {
                        this.socketIndex.delete(socketId)
                    }
                }
            }
        }
    }

    private cleanupExpiredPlayers(playerTtlMs: number) {
        const now = Date.now()
        for (const session of this.sessions.values()) {
            for (const [playerId, player] of session.players.entries()) {
                if (player.socketIds.size > 0) continue
                if (now - player.lastSeenAt <= playerTtlMs) continue

                session.players.delete(playerId)
                session.playerIdByToken.delete(player.token)
            }
        }
    }
}

function parseMs(value: string | undefined, fallback: number): number {
    if (!value) return fallback
    const parsed = Number(value)
    if (!Number.isFinite(parsed) || parsed <= 0) return fallback
    return parsed
}
