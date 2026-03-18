import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    MessageBody,
    ConnectedSocket
} from "@nestjs/websockets"
import { Server, Socket } from "socket.io"
import { GameService } from "./game.service"

@WebSocketGateway({
    cors: {
        origin: "*"
    }
})
export class GameGateway {
    @WebSocketServer()
    server!: Server

    constructor(private gameService: GameService) {}

    //Join session
    @SubscribeMessage("join")
    handleJoin(
        @MessageBody() data: { sessionId: string },
        @ConnectedSocket() client: Socket
    ) {
        const { sessionId } = data

        const result = this.gameService.joinSession(sessionId)

        client.join(sessionId)

        const state = this.gameService.getState(sessionId)

        return {
            ...result,
            state
        }
    }
    
    //Player action
    @SubscribeMessage("action")
    handleAction(
        @MessageBody() data: { sessionId: string, actionId: string, playerId: string },
        @ConnectedSocket() client: Socket
    ) {
        const { sessionId, actionId, playerId } = data
    
        const state = this.gameService.dispatch(sessionId, playerId, actionId)
    
        //Broadcast to all the players in the session
        this.server.to(sessionId).emit("state_update", state)
    
        return state
    }
}
