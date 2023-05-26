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
import { GameGateway } from "./game/game.gateway";
import { DISCONNECTION_TIMEOUT } from "./classes/OngoingGames";

const DISCONNECTION_STATUS_TIMEOUT = 2000;

@WebSocketGateway(8001, { cors: process.env.FRONTEND_URL })
export class AppGateway
	implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
	private readonly logger = new Logger(AppGateway.name);
	@WebSocketServer()
	io: Namespace;
	users: OnlineUsers = new OnlineUsers();
	waitingReconnection: Set<number> = new Set<number>();

	constructor(
		private userService: UserService,
		private gameSocket: GameGateway,
	) {}

	afterInit(): any {
		this.logger.log("Websocket AppGateway initialized.");
	}

	async emitAllUserFriends(
		user: User,
		socketMsg: string,
		id: number,
		userName: string,
		status: UserStatus,
	) {
		const onlineFriends = await this.users.getFriendsOfByUserId(
			user.id,
			this.userService,
		);
		for (let friend of onlineFriends) {
			this.users.emitAllbyUserId(friend.id, socketMsg, {
				id: id,
				userName: userName,
				status: status,
			});
		}
	}

	async changeUserStatus(
		user: User,
		online: boolean,
		inGame?: boolean | false,
	) {
		const newStatus = inGame
			? UserStatus.INGAME
			: online
			? UserStatus.ONLINE
			: UserStatus.OFFLINE;
		this.users.updateStatus(user.id, newStatus);
		await this.userService.changeUserStatus(user.id, newStatus);
		this.emitAllUserFriends(
			user,
			"updateOnlineFriend",
			user.id,
			user.userName,
			newStatus,
		);
		this.emitAllUserFriends(
			user,
			"userStatusUpdatedUsersList",
			user.id,
			user.userName,
			newStatus,
		);
	}

	async handleDisconnect(client: Socket) {
		const user: User = this.users.getUserByClientId(client.id);
		if (!user) return;
		if (this.users.getClientsByUserId(user.id).size === 1) {
			this.waitingReconnection.add(user.id);
			setTimeout(async () => {
				if (this.waitingReconnection.has(user.id)) {
					this.waitingReconnection.delete(user.id);
					await this.changeUserStatus(user, false);
				}
				this.users.removeClientId(client.id);
				this.logger.log(
					`WS Client ${client.id} (${user.userName}) disconnected !`,
				);
				this.logger.log(`${this.users.size} user(s) connected !`);
			}, DISCONNECTION_STATUS_TIMEOUT);
		} else {
			this.users.removeClientId(client.id);
			this.logger.log(
				`WS Client ${client.id} (${user.userName}) disconnected !`,
			);
			this.logger.log(`${this.users.size} user(s) connected !`);
		}
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
		if (this.waitingReconnection.has(user.id))
			this.waitingReconnection.delete(user.id);
		if (this.users.hasByUserId(user.id))
			this.users.addClientToUserId(user.id, client);
		else {
			this.users.addNewUser(user, client);
			await this.changeUserStatus(user, true);
		}
		this.logger.log(`Client ${client.id} (${user.userName}) connected.`);
		this.logger.log(`${this.users.size} user(s) connected.`);
	}

	@SubscribeMessage("showUsers")
	showUsers(@ConnectedSocket() client: Socket) {
		console.log("APP SOCKET :");
		this.users.showOnlineUsers();
	}

	@SubscribeMessage("askUserStatus")
	async askUserStatus(
		@ConnectedSocket() client: Socket,
		@MessageBody() userName: string,
	) {
		const user = await this.userService.getUserByUserName(userName);
		if (!user) client.emit("getUserStatus", null);
		else client.emit("getUserStatus", user.status);
	}

	@SubscribeMessage("askUserName")
	async askUserName(
		@ConnectedSocket() client: Socket,
		@MessageBody() userName: string,
	) {
		const user = await this.userService.getUserByUserName(userName);
		if (!user) client.emit("getUserStatus", null);
		else client.emit("getUserStatus", user.status);
	}

	@SubscribeMessage("userNameUpdated")
	async userNameUpdated(
		@ConnectedSocket() client: Socket,
		@MessageBody() newUserName: string,
	) {
		let user = this.users.getUserByClientId(client.id);
		if (!user) return;
		this.users.updateUserName(user, newUserName);
		user = this.users.getUserByClientId(client.id);
		if (!user) return;
		this.io.emit("userNameUpdatedProfile", {
			id: user.id,
			userName: newUserName,
			status: user.status,
		});
		this.emitAllUserFriends(
			user,
			"updateOnlineFriend",
			user.id,
			user.userName,
			user.status,
		);
		this.io.emit("userNameUpdatedUsersList", {
			id: user.id,
			userName: newUserName,
			status: user.status,
		});
	}

	@SubscribeMessage("userStatusInGame")
	async newInGameStatus(
		@MessageBody("ownerId") ownerId: number,
		@MessageBody("playerId") playerId: number,
		@MessageBody("inGame") inGame: boolean,
	) {
		const owner = this.users.getUserByUserId(ownerId);
		const player = this.users.getUserByUserId(playerId);
		if (owner) await this.changeUserStatus(owner, true, inGame);
		if (player) await this.changeUserStatus(player, true, inGame);
	}

	@SubscribeMessage("sendGameInvite")
	sendGameInvite(
		@MessageBody("sender") sender: number,
		@MessageBody("invited") invited: number,
	) {
		const userInvited = this.users.getUserByUserId(invited);
		const userSender = this.users.getUserByUserId(sender);
		if (userInvited) {
			this.users.emitAllbyUserId(userInvited.id, "inviteGameRequest", {
				senderId: userSender.id,
				senderUserName: userSender.userName,
			});
		} else {
			setTimeout(() => {
				this.declineGameInvite(
					userSender.id,
					"Can't find user to invite, try again later.",
				);
			}, DISCONNECTION_TIMEOUT);
		}
	}

	@SubscribeMessage("acceptGameInvite")
	acceptGameInvite(
		@ConnectedSocket() client: Socket,
		@MessageBody("senderId") senderId: number,
		@MessageBody("message") message: string,
	) {
		const player = this.users.getUserByClientId(client.id);
		if (!player)
			return this.users.emitAllbyUserId(senderId, "inviteDeclined", {
				message,
			});
		this.gameSocket.createPrivateGame(senderId, player.id);
		this.users.emitAllbyUserId(senderId, "inviteAccepted", {
			playerId: player.id,
			message,
		});
	}

	@SubscribeMessage("declineGameInvite")
	declineGameInvite(
		@MessageBody("senderId") senderId: number,
		@MessageBody("message") message: string,
	) {
		this.users.emitAllbyUserId(senderId, "inviteDeclined", {
			message,
		});
	}
}
