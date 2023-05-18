import { User } from "@prisma/client";
import { GameType } from "../game/types/game.type";
import { Pair } from "../game/types/pair.type";

export const GAME_LIMIT_SCORE: number = 10;
export const DISCONNECTION_TIMEOUT: number = 15000;

export class OngoingGames {
	private _games: Map<string, GameType>;
	private _users: Map<number, string>;

	constructor() {
		this._games = new Map<string, GameType>();
		this._users = new Map<number, string>();
	}

	addGame(room: string, owner: User, player: User): GameType {
		this._games.set(room, {
			id: room,
			started: false,
			owner,
			ownerId: owner.id,
			player,
			playerId: player.id,
			ownerScore: 0,
			playerScore: 0,
			winnerId: 0,
			accelerator: false,
			map: 0,
		});
		this._users.set(owner.id, room);
		this._users.set(player.id, room);
		return this._games.get(room);
	}

	removeGame(room: string): void {
		const game: GameType = this._games.get(room);
		const usersPair: Pair<number> = {
			first: game.ownerId,
			second: game.playerId,
		};
		this._users.delete(usersPair.first);
		this._users.delete(usersPair.second);
		this._games.delete(room);
	}

	getGameById(room: string): GameType | undefined {
		return this._games.get(room);
	}

	getGameIdByUserId(userId: number): string {
		return this._users.get(userId);
	}

	setAcceleratorById(room: string, accelerator: boolean) {
		const game = this._games.get(room);
		this._games.set(room, { ...game, accelerator });
	}

	setMapById(room: string, map: number) {
		const game = this._games.get(room);
		this._games.set(room, { ...game, map });
	}

	setStarted(room: string) {
		const game = this._games.get(room);
		this._games.set(room, { ...game, started: true });
	}

	playerScored(room: string): boolean {
		this._games.get(room).playerScore++;
		return this._games.get(room).playerScore === GAME_LIMIT_SCORE;
	}

	ownerScored(room: string): boolean {
		this._games.get(room).ownerScore++;
		return this._games.get(room).ownerScore === GAME_LIMIT_SCORE;
	}

	getScore(room: string): Pair<number> {
		return {
			first: this._games.get(room).ownerScore,
			second: this._games.get(room).playerScore,
		};
	}

	alreadyInGame(userId: number): boolean {
		return this._users.has(userId);
	}

	showGames() {
		for (let game of this._games) console.log(game);
	}
}
