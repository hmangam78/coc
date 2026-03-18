import { Module } from "@nestjs/common"
import { GameService } from "./game.service"
import { GameController } from "./game.controller"
import { GameGateway } from "./game.gateway"
import { ScenarioService } from "../scenario/scenario.service"

@Module({
    controllers: [GameController],
    providers: [GameService, GameGateway, ScenarioService]
})

export class GameModule {}
