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
import type {
    ActionRequestV1,
    ActionAckV2,
    EventsEnvelopeV1,
    JoinRequestV1,
    JoinResponseV1,
    StateUpdateV1
} from "@coc/protocol"
import { parseWs, ActionRequestSchema, JoinRequestSchema } from "./game.validation"

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
        @MessageBody() data: JoinRequestV1,
        @ConnectedSocket() client: Socket
    ): JoinResponseV1 {
        const parsed = parseWs(JoinRequestSchema, data)
        const { sessionId } = parsed

        const result = this.gameService.joinSession(sessionId, client.id, parsed.playerToken)

        client.join(sessionId)
        client.join(this.gameService.getPlayerRoom(sessionId, result.playerId))

        const view: StateUpdateV1 = this.gameService.getViewForPlayer(sessionId, result.playerId)

        return {
            ...result,
            ...view
        }
    }
    
    //Player action
    @SubscribeMessage("action")
    handleAction(
        @MessageBody() data: ActionRequestV1,
        @ConnectedSocket() client: Socket
    ): ActionAckV2 {
        const parsed = parseWs(ActionRequestSchema, data)
        const { sessionId, actionId, playerToken } = parsed
    
        const result = this.gameService.dispatchByToken(sessionId, playerToken, actionId)
    
        //Domain events (separate channel)
        const eventsEnvelope: EventsEnvelopeV1 = {
            playerId: result.playerId,
            characterId: result.characterId,
            events: result.events,
            ts: Date.now(),
            seq: result.seq
        }
        this.server
            .to(this.gameService.getPlayerRoom(sessionId, result.playerId))
            .emit("events", eventsEnvelope)

        //Broadcast filtered view per player
        for (const playerId of this.gameService.getSessionPlayerIds(sessionId)) {
            const view: StateUpdateV1 = this.gameService.getViewForPlayer(sessionId, playerId)
            this.server
                .to(this.gameService.getPlayerRoom(sessionId, playerId))
                .emit("state_update", view)
        }
    
        return { accepted: true }
    }

    handleDisconnect(client: Socket) {
        this.gameService.disconnectSocket(client.id)
    }
}
