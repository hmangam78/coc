import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    MessageBody,
    ConnectedSocket,
    OnGatewayDisconnect
} from "@nestjs/websockets"
import { Server, Socket } from "socket.io"
import { GameService } from "./game.service"

@WebSocketGateway({
    cors: {
        origin: "*"
    }
})
export class GameGateway implements OnGatewayDisconnect {
    @WebSocketServer()
    server!: Server

    constructor(private gameService: GameService) {}

    //Join session
    @SubscribeMessage("join")
    handleJoin(
        @MessageBody() data: { sessionId: string; playerToken?: string },
        @ConnectedSocket() client: Socket
    ) {
        const { sessionId } = data

        const result = this.gameService.joinSession(sessionId, client.id, data.playerToken)

        client.join(sessionId)
        client.join(this.gameService.getPlayerRoom(sessionId, result.playerId))

        const view = this.gameService.getViewForPlayer(sessionId, result.playerId)

        return {
            ...result,
            ...view
        }
    }
    
    //Player action
    @SubscribeMessage("action")
    handleAction(
        @MessageBody() data: { sessionId: string; actionId: string; playerToken: string },
        @ConnectedSocket() client: Socket
    ) {
        const { sessionId, actionId, playerToken } = data
    
        const result = this.gameService.dispatchByToken(sessionId, playerToken, actionId)
    
        //Domain events (separate channel)
        this.server
            .to(this.gameService.getPlayerRoom(sessionId, result.playerId))
            .emit("events", {
                playerId: result.playerId,
                characterId: result.characterId,
                events: result.events
            })

        //Broadcast filtered view per player
        for (const playerId of this.gameService.getSessionPlayerIds(sessionId)) {
            const view = this.gameService.getViewForPlayer(sessionId, playerId)
            this.server
                .to(this.gameService.getPlayerRoom(sessionId, playerId))
                .emit("state_update", view)
        }
    
        return result.state
    }

    handleDisconnect(client: Socket) {
        this.gameService.disconnectSocket(client.id)
    }
}
