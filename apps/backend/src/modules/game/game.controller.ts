import { Controller, Get, Post, Body, Param } from "@nestjs/common"
import { GameService } from "./game.service"
import { GameState } from "@coc/types"

@Controller("game")
export class GameController {
    constructor(private readonly gameService: GameService) {}

    @Post("session")
    createSession() {
        return { sessionId: this.gameService.createSession() }
    }

    @Post(":sessionId/join")
    join(@Param("sessionId") sessionId: string) {
        return this.gameService.joinSession(sessionId)
    }

    @Get(":sessionId")
    getState(@Param("sessionId") sessionId: string): GameState {
        return this.gameService.getState(sessionId)
    }

    @Post(":sessionId/action")
    action(
        @Param("sessionId") sessionId: string,
        @Body() body: { actionId: string }) {
        return this.gameService.dispatch(sessionId, body.actionId)
    }
}