import { Injectable } from "@nestjs/common"
import { GameEngine } from "@coc/engine"
import { GameState } from "@coc/types"
import { v4 as uuid } from "uuid"
import scenarioJson from "../../../../../scenarios/test.json"

type Player = {
    id: string
}

type Session = {
    id: string,
    engine: GameEngine,
    players: Player[]
}

@Injectable()
export class GameService {
    private sessions = new Map<string, Session>
    private engine = new GameEngine(scenarioJson as any)

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
        if (!session) throw new Error("Session not found")

            const playerId = uuid()

            session.players.push({ id: playerId })

            return { playerId }
    }

    getState(sessionId: string): GameState {
        const session = this.sessions.get(sessionId)
        if (!session) throw new Error("Session not found")

        return session.engine.getState()
    }

    dispatch(sessionId: string, actionId: string): GameState {
        const session = this.sessions.get(sessionId)
        if (!session) throw new Error("Session not found")

        return session.engine.dispatch(actionId)
    }
}