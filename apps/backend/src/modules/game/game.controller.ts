import { Controller, Get, Post, Body, Param } from "@nestjs/common"
import { GameService } from "./game.service"
import type { GameState } from "@coc/types"
import { ScenarioService } from "../scenario/scenario.service"

@Controller("game")
export class GameController {
    constructor(
        private readonly gameService: GameService,
        private readonly scenarioService: ScenarioService
    ) {}

    @Post("session")
    async createSession(@Body() body: { scenarioId?: string } = {}) {
        return { sessionId: await this.gameService.createSession(body.scenarioId) }
    }

    @Get("scenarios")
    async listScenarios() {
        return { scenarios: await this.scenarioService.listScenarios() }
    }

    @Post(":sessionId/join")
    join(@Param("sessionId") sessionId: string) {
        return this.gameService.createPlayer(sessionId)
    }

    @Get(":sessionId")
    getState(@Param("sessionId") sessionId: string): GameState {
        return this.gameService.getRawState(sessionId)
    }

    @Post(":sessionId/action")
    action(
        @Param("sessionId") sessionId: string,
        @Body() body: { playerToken: string, actionId: string }) {
        return this.gameService.dispatchByToken(sessionId, body.playerToken, body.actionId).state
    }
}
