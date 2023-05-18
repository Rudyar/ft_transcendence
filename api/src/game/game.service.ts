import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { GameType } from "./types/game.type";
import { Game, Prisma } from "@prisma/client";
import { GAME_LIMIT_SCORE } from "../classes/OngoingGames";
import { UserService } from "../user/user.service";

@Injectable()
export class GameService {
	constructor(
		private prisma: PrismaService,
		private userService: UserService,
	) {}

	async postGame(game: GameType): Promise<Game> {
		this.userService.newGameFinished(game);
		return await this.prisma.game.create({
			data: {
				owner: { connect: { id: game.ownerId } },
				player: { connect: { id: game.playerId } },
				ownerScore: game.ownerScore,
				playerScore: game.playerScore,
				winnerId: game.winnerId,
			},
		});
	}
}
