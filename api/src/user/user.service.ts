import {
	ForbiddenException,
	HttpException,
	HttpStatus,
	Injectable,
	StreamableFile,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { userInfo42Dto } from "../auth/dto";
import { User, UserStatus } from "@prisma/client";
import { createReadStream } from "fs";
import { authenticator } from "otplib";
import { toDataURL } from "qrcode";
import * as fs from "fs";
import { GameType } from "../game/types/game.type";
import { GameInfosType } from "../common/types";

@Injectable()
export class UserService {
	constructor(private prisma: PrismaService) {}

	async setUserSocket(userName: string, socket: string) {
		await this.prisma.user.update({
			where: {
				userName: userName,
			},
			data: {
				socket: socket,
			},
		});
	}

	async getUserByEmail(email: string): Promise<User> {
		return await this.prisma.user.findUnique({
			where: {
				email: email,
			},
		});
	}

	async getUserByUserName(userName: string): Promise<User> {
		return await this.prisma.user.findUnique({
			where: {
				userName,
			},
		});
	}

	async getUserById(id: number): Promise<User> {
		return await this.prisma.user.findUnique({
			where: {
				id,
			},
		});
	}

	async createUser42(newUser: userInfo42Dto): Promise<User> {
		if (!newUser.image) newUser.image = "";
		return await this.prisma.user.create({
			data: {
				email: newUser.email,
				userName: newUser.login,
				hash: "", // to del ?
				firstName: newUser.first_name,
				lastName: newUser.last_name,
				avatar: newUser.image,
				socket: "",
				wins: 0,
				losses: 0,
			},
		});
	}

	async uploadAvatar(userName: string, file: Express.Multer.File) {
		const user = await this.getUserByUserName(userName);
		if (!user) throw new ForbiddenException("Can't find user, try again");
		try {
			await fs.promises.unlink(user.avatar);
		} catch (e) {}
		const fileUrl = process.cwd() + `./files/avatars/${file.filename}`;
		await this.prisma.user.update({
			where: {
				email: user.email,
			},
			data: {
				avatar: fileUrl,
			},
		});
	}

	async getAvatar(user: User): Promise<StreamableFile | String> {
		if (!user.avatar || user.avatar === "") {
			throw new HttpException("Can't provide avatar", HttpStatus.NO_CONTENT);
		} else if (
			user.avatar.includes("/files/avatars/") &&
			fs.existsSync(user.avatar)
		) {
			return new StreamableFile(createReadStream(user.avatar));
		} else if (user.avatar.includes("https://cdn.intra.42.fr/users/")) {
			return user.avatar;
		} else {
			throw new HttpException("Can't provide avatar", HttpStatus.NO_CONTENT);
		}
	}

	async updateUserName(userName: string, newUserName: string): Promise<User> {
		const user = await this.getUserByUserName(userName);
		if (!user) throw new ForbiddenException("Can't find user, try again");
		const userWithSameUserName = await this.getUserByUserName(newUserName);
		if (userWithSameUserName)
			throw new ForbiddenException("This username is already taken");
		return await this.prisma.user.update({
			where: {
				email: user.email,
			},
			data: {
				userName: newUserName,
			},
		});
	}

	async getUserFriends(user: User): Promise<{
		friends: {
			id: number;
			userName: string;
			status: UserStatus;
		}[];
	}> {
		const list = await this.prisma.user.findUnique({
			where: {
				id: user.id,
			},
			select: {
				friends: {
					select: {
						id: true,
						userName: true,
						status: true,
					},
				},
			},
		});
		list.friends.sort((a: any, b: any) => a.userName.localeCompare(b.userName));
		return list;
	}

	async getUserFriendsOf(user: User): Promise<{
		friendsOf: {
			id: number;
			userName: string;
			status: UserStatus;
		}[];
	}> {
		return await this.prisma.user.findUnique({
			where: {
				id: user.id,
			},
			select: {
				friendsOf: {
					select: {
						id: true,
						userName: true,
						status: true,
					},
				},
			},
		});
	}

	async getAllUsers(): Promise<{ id: number; userName: string }[]> {
		const users = await this.prisma.user.findMany({
			select: {
				id: true,
				userName: true,
			},
		});
		return users;
	}

	async getJoignableUsers(userName: string) {
		const users = await this.prisma.user.findMany({
			where: {
				NOT: {
					channels: {
						some: {
							AND: [
								{ members: { some: { userName: userName } } },
								{ type: "DM" },
							],
						},
					},
				},
			},
		});
		return users;
	}

	async getAllGames(userId: number): Promise<GameInfosType[]> {
		const playerGames = await this.prisma.user.findUnique({
			where: { id: userId },
			select: {
				playerGames: {
					select: {
						owner: {
							select: {
								userName: true,
							},
						},
						player: {
							select: {
								userName: true,
							},
						},
						id: true,
						ownerId: true,
						playerId: true,
						ownerScore: true,
						playerScore: true,
						winnerId: true,
					},
				},
			},
		});
		const ownedGames = await this.prisma.user.findUnique({
			where: { id: userId },
			select: {
				ownedGames: {
					select: {
						owner: {
							select: {
								userName: true,
							},
						},
						player: {
							select: {
								userName: true,
							},
						},
						id: true,
						ownerId: true,
						playerId: true,
						ownerScore: true,
						playerScore: true,
						winnerId: true,
					},
				},
			},
		});
		const allGames = new Array<GameInfosType>();
		playerGames.playerGames.forEach((game) => {
			const owner: Boolean = userId === game.ownerId;
			allGames.push({
				id: game.id,
				opponentUsername: owner ? game.player.userName : game.owner.userName,
				won: userId === game.winnerId,
				ownScore: owner ? game.ownerScore : game.playerScore,
				playerScore: owner ? game.playerScore : game.ownerScore,
			});
		});
		ownedGames.ownedGames.forEach((game) => {
			const owner: Boolean = userId === game.ownerId;
			allGames.push({
				id: game.id,
				opponentUsername: owner ? game.player.userName : game.owner.userName,
				won: userId === game.winnerId,
				ownScore: owner ? game.ownerScore : game.playerScore,
				playerScore: owner ? game.playerScore : game.ownerScore,
			});
		});
		allGames.sort((a, b) => a.id - b.id);
		return allGames;
	}

	async addToFriend(userName: string, newFriendUserName: string) {
		const user = await this.getUserByUserName(userName);
		const userFriend = await this.getUserByUserName(newFriendUserName);
		if (!user || !userFriend)
			throw new ForbiddenException("Can't find user friend, try again");
		if (userName === newFriendUserName)
			throw new ForbiddenException("Can't add friend, try again");

		const friends = await this.getUserFriends(user);
		if (friends.friends.some((f) => f.userName === newFriendUserName)) return;
		await this.prisma.user.update({
			where: { id: user.id },
			data: { friends: { connect: { id: userFriend.id } } },
			include: { friends: true },
		});
	}

	async removeFromFriend(userName: string, newFriendUserName: string) {
		const user = await this.getUserByUserName(userName);
		const userFriend = await this.getUserByUserName(newFriendUserName);
		if (!user || !userFriend)
			throw new ForbiddenException("Can't find user friend, try again");
		if (userName === newFriendUserName)
			throw new ForbiddenException("Can't remove friend, try again");
		const friends = await this.getUserFriends(user);
		if (friends.friends.some((f) => f.userName === newFriendUserName)) {
			await this.prisma.user.update({
				where: { id: user.id },
				data: { friends: { disconnect: { id: userFriend.id } } },
				include: { friends: true },
			});
		}
	}

	async setTfaSecret(userName: string, secret: string): Promise<void> {
		await this.prisma.user.update({
			where: {
				userName,
			},
			data: {
				tfaSecret: secret,
			},
		});
	}

	async toggleTfa(userName: string, value: boolean): Promise<void> {
		await this.prisma.user.update({
			where: {
				userName,
			},
			data: {
				isTfaEnable: value,
			},
		});
	}

	async removeTfa(userName: string): Promise<void> {
		const user = await this.getUserByUserName(userName);
		if (!user) throw new ForbiddenException("Can't find user, try again");
		await this.setTfaSecret(user.userName, "");
		await this.toggleTfa(user.userName, false);
	}

	async generateTfaSecret(userName: string): Promise<string> {
		const user = await this.getUserByUserName(userName);
		if (!user) throw new ForbiddenException("Can't find user, try again");
		const secret = authenticator.generateSecret();
		const otpAuthUrl = authenticator.keyuri(
			user.email,
			"Transcendence",
			secret,
		);
		await this.setTfaSecret(user.userName, secret);
		return otpAuthUrl;
	}

	generateQrCodeDataUrl(otpAuthUrl: string): any {
		return toDataURL(otpAuthUrl);
	}

	async isTfaCodeValid(userName: string, code: string): Promise<boolean> {
		const user = await this.getUserByUserName(userName);
		if (!user) throw new ForbiddenException("Can't find user, try again");
		return authenticator.verify({ token: code, secret: user.tfaSecret });
	}

	async changeUserStatus(userId: number, newStatus: UserStatus) {
		await this.prisma.user.update({
			where: { id: userId },
			data: { status: newStatus },
		});
	}

	async newGameFinished(game: GameType) {
		const winnerId = game.winnerId;
		const loserId =
			game.winnerId === game.ownerId ? game.playerId : game.ownerId;
		const winner = await this.getUserById(winnerId);
		const loser = await this.getUserById(loserId);
		await this.prisma.user.update({
			where: { id: winnerId },
			data: { wins: winner.wins + 1 },
		});
		await this.prisma.user.update({
			where: { id: loserId },
			data: { losses: loser.losses + 1 },
		});
	}

	async dropdb(): Promise<void> {
		// to del
		await this.prisma.user.deleteMany({});
	}
}
