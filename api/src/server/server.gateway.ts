import {
	MessageBody,
	SubscribeMessage,
	WebSocketGateway,
	WebSocketServer,
} from "@nestjs/websockets";
import { Server } from "http";

@WebSocketGateway(8001, { cors: "*" })
export class ServerGateway {
	@WebSocketServer()
	server: Server;
	@SubscribeMessage("message")
	handleMessage(@MessageBody() message: string): void {
		console.log(message);
		this.server.emit("message", message);
	}
}
