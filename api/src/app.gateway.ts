import { Logger } from "@nestjs/common";
import {
	ConnectedSocket,
	MessageBody,
	OnGatewayConnection,
	OnGatewayDisconnect,
	OnGatewayInit,
	SubscribeMessage,
	WebSocketGateway,
	WebSocketServer,
} from "@nestjs/websockets";
import { Namespace, Socket } from "socket.io";
import { UserService } from "./user/user.service";
import { User, UserStatus } from "@prisma/client";
import { OnlineUsers } from "./classes/OnlineUsers";

@WebSocketGateway(8001, { cors: "*" })
export class AppGateway
	implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
	private readonly logger = new Logger(AppGateway.name);
	@WebSocketServer()
	io: Namespace;
	users: OnlineUsers = new OnlineUsers();

	constructor(private userService: UserService) {}

	afterInit(): any {
		this.logger.log("Websocket AppGateway initialized.");
	}

	async changeUserStatus(user: User, online: boolean) {
		const newStatus = online ? UserStatus.ONLINE : UserStatus.OFFLINE;
		await this.userService.changeUserStatus(user.id, newStatus);
		let onlineFriends = await this.users.getFriendsOfByUserId(
			user.id,
			this.userService,
		);
		for (let friend of onlineFriends) {
			this.users.emitAllbyUserId(friend.id, "updateOnlineFriend", {
				id: user.id,
				userName: user.userName,
				status: newStatus,
			});
		}
	}

	async handleDisconnect(client: Socket) {
		const user: User = this.users.getUserByClientId(client.id);
		if (!user) return;
		await this.changeUserStatus(user, false);
		this.logger.log(`WS Client ${client.id} (${user.userName}) disconnected !`);
		this.users.removeClientId(client.id);
		this.logger.log(`${this.users.size} user(s) connected !`);
	}

	async handleConnection(@ConnectedSocket() client: Socket) {
		const user = await this.userService.getUserByEmail(
			`${client.handshake.query.email}`,
		);
		if (!user) {
			this.logger.log(
				`Could not connect: ${
					client.handshake.query.email === undefined
						? "no email provided"
						: "user does not exist."
				}`,
			);
			client.emit("connectionFailed");
			client.disconnect();
			return;
		}
		if (this.users.hasByUserId(user.id))
			this.users.addClientToUserId(user.id, client);
		else {
			this.users.addNewUser(user, client);
			await this.changeUserStatus(user, true);
		}
		this.logger.log(`WS Client ${client.id} (${user.userName}) connected !`);
		this.logger.log(`${this.users.size} user(s) connected !`);
	}

	@SubscribeMessage("showUsers")
	showUsers(@ConnectedSocket() client: Socket) {
		this.users.showOnlineUsers();
	}

	@SubscribeMessage("userNameUpdated")
	async userNameUpdated(
		@ConnectedSocket() client: Socket,
		@MessageBody() newUserName: string,
	) {
		const user = this.users.getUserByClientId(client.id);
		const onlineFriends = await this.users.getFriendsOfByUserId(
			user.id,
			this.userService,
		);
		// setTimeout(() => {}, 200);
		for (let friend of onlineFriends) {
			this.users.emitAllbyUserId(friend.id, "updateOnlineFriend", {
				id: user.id,
				userName: newUserName,
				status: user.status,
			});
		}
	}
}