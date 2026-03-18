import { Controller, Get, Post, Body, Param } from "@nestjs/common"
import { GameService } from "./game.service"
import type { GameState } from "@coc/types"
import { ScenarioService } from "../scenario/scenario.service"
import type {
    ActionRestRequestV1,
    ActionRestResponseV2,
    CreateSessionRequestV1,
    CreateSessionResponseV1,
    JoinRestResponseV1,
    ListScenariosResponseV1
} from "@coc/protocol"
import {
    ActionRestRequestSchema,
    CreateSessionRequestSchema,
    parseHttp
} from "./game.validation"

@Controller("game")
export class GameController {
    constructor(
        private readonly gameService: GameService,
        private readonly scenarioService: ScenarioService
    ) {}

    @Post("session")
    async createSession(
        @Body() body: CreateSessionRequestV1 = {}
    ): Promise<CreateSessionResponseV1> {
        const parsed = parseHttp(CreateSessionRequestSchema, body)
        return { sessionId: await this.gameService.createSession(parsed.scenarioId) }
    }

    @Get("scenarios")
    async listScenarios(): Promise<ListScenariosResponseV1> {
        return { scenarios: await this.scenarioService.listScenarios() }
    }

    @Post(":sessionId/join")
    join(@Param("sessionId") sessionId: string): JoinRestResponseV1 {
        return this.gameService.createPlayer(sessionId)
    }

    @Get(":sessionId")
    getState(@Param("sessionId") sessionId: string): GameState {
        return this.gameService.getRawState(sessionId)
    }

    @Post(":sessionId/action")
    action(
        @Param("sessionId") sessionId: string,
        @Body() body: ActionRestRequestV1
    ): ActionRestResponseV2 {
        const parsed = parseHttp(ActionRestRequestSchema, body)
        const result = this.gameService.dispatchByToken(sessionId, parsed.playerToken, parsed.actionId)
        return {
            stateUpdate: this.gameService.getViewForPlayer(sessionId, result.playerId),
            events: {
                playerId: result.playerId,
                characterId: result.characterId,
                events: result.events,
                ts: Date.now(),
                seq: result.seq
            }
        }
    }
}
