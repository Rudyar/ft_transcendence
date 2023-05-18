import { User, UserStatus } from "@prisma/client";
import { Socket } from "socket.io";
import { UserType } from "../game/types/user.type";
import { UserService } from "../user/user.service";

export class OnlineUsers {
	private _users: Map<number, UserType>;
	private _clients: Map<string, number>;
	size: number;

	constructor() {
		this._users = new Map<number, UserType>();
		this._clients = new Map<string, number>();
		this.size = 0;
	}

	getUsers() {
		return this._users;
	}

	addNewUser(user: User, client: Socket): void {
		this._clients.set(client.id, user.id);
		const clientMap = new Map<string, Socket>([[client.id, client]]);
		this._users.set(user.id, {
			user,
			sockets: clientMap,
		});
		this.size++;
	}

	removeClientId(clientId: string, removeUser?: boolean): void {
		const userId = this._clients.get(clientId);
		this._clients.delete(clientId);
		if (userId !== undefined) {
			const user: UserType = this._users.get(userId);
			user.sockets.delete(clientId);
			if (user.sockets.size === 0) {
				this._users.delete(userId);
				this.size--;
			}
		}
	}

	updateStatus(userId: number, newStatus: UserStatus) {
		const user: User = this.getUserByUserId(userId);
		if (!user) return;
		const sockets: Map<string, Socket> = this.getClientsByUserId(userId);
		this._users.set(userId, {
			user: { ...user, status: newStatus },
			sockets: sockets,
		});
	}

	updateUserName(userId: number, newUserName: string) {
		const user: User = this.getUserByUserId(userId);
		if (!user) return;
		const sockets: Map<string, Socket> = this.getClientsByUserId(userId);
		this._users.set(userId, {
			user: { ...user, userName: newUserName },
			sockets: sockets,
		});
	}

	hasByUserId(userId: number): boolean {
		return this._users.has(userId);
	}

	hasByClientId(clientId: string): boolean {
		return this._clients.has(clientId);
	}

	getClientsByUserId(userId: number): Map<string, Socket> | null {
		return this._users.get(userId).sockets || null;
	}

	getClientsByClientId(clientId: string): Map<string, Socket> | null {
		const userId = this._clients.get(clientId);
		if (userId !== undefined) return this._users.get(userId).sockets || null;
		return null;
	}

	getUserByClientId(clientId: string): User | null {
		const userId = this._clients.get(clientId);
		if (userId !== undefined) return this._users.get(userId).user;
		return null;
	}

	getUserByUserId(userId: number): User | null {
		return this._users.get(userId).user || null;
	}

	addClientToUserId(userId: number, client: Socket): void {
		this._clients.set(client.id, userId);
		const user: UserType = this._users.get(userId);
		user.sockets.set(client.id, client);
	}

	emitAllbyUserId(userId: number, emit: string, content: any) {
		this.getClientsByUserId(userId).forEach((client) => {
			client.emit(emit, content);
		});
	}

	joinAllbyUserId(userId: number, room: string) {
		this.getClientsByUserId(userId).forEach((client) => {
			client.join(room);
		});
	}

	leaveAllbyUserId(userId: number, room: string) {
		this.getClientsByUserId(userId).forEach((client) => {
			client.join(room);
		});
	}

	async getFriendsOfByUserId(
		userId: number,
		userService: UserService,
	): Promise<Array<{ id: number; userName: string; status: UserStatus }>> {
		const userI = this._users.get(userId);
		if (!userI) return [];
		const friends = await userService.getUserFriendsOf(userI.user);
		const onlineFriends = friends.friendsOf.filter((friend) =>
			this._users.has(friend.id),
		);
		return onlineFriends;
	}

	showOnlineUsers() {
		console.log("CONNECTED USERS : \n");
		console.log(this._users);
		console.log("\nCONNECTED CLIENTS : \n");
		console.log(this._clients);
	}
}
