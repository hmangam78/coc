import { Injectable } from "@nestjs/common"
import { BadRequestException } from "@nestjs/common"
import { GameEngine } from "@coc/engine"
import { GameState } from "@coc/types"
import { v4 as uuid } from "uuid"
import scenarioJson from "../../../../../scenarios/test.json"

type Player = {
    id: string
    characterId?: string
}

type Session = {
    id: string,
    engine: GameEngine,
    players: Player[]
}

@Injectable()
export class GameService {
    private sessions = new Map<string, Session>

    createSession(): string {
        const sessionId = uuid()

        const session: Session = {
            id: sessionId,
            engine: new GameEngine(scenarioJson as any),
            players: []
        }

        this.sessions.set(sessionId, session)

        return sessionId
    }

    joinSession(sessionId: string) {
        const session = this.sessions.get(sessionId)
        if (!session) throw new BadRequestException("Session not found")

        const playerId = uuid()

        //Get available characters
        const state = session.engine.getState()

        const assignedCharacterIds = new Set(
            session.players
                .map(p => p.characterId)
                .filter(Boolean)
        )

        const availableCharacter = Object.values(state.characters).find(
            c => !assignedCharacterIds.has(c.id)
        )

        if (!availableCharacter) {
            throw new BadRequestException("No available characters")
        }

        session.players.push({
            id: playerId,
            characterId: availableCharacter.id
        })

        return { playerId, characterId: availableCharacter.id }
    }

    getState(sessionId: string): GameState {
        const session = this.sessions.get(sessionId)
        if (!session) throw new BadRequestException("Session not found")

        return session.engine.getState()
    }

    dispatch(sessionId: string, playerId: string, actionId: string): GameState {
        const session = this.sessions.get(sessionId)
        if (!session) throw new BadRequestException("Session not found")

        const player = session.players.find(p => p.id === playerId)
        if (!player || !player.characterId) {
            throw new BadRequestException("Player has no character")
        }

        return session.engine.dispatch(actionId, player.characterId)
    }
}