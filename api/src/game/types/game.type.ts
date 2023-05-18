import { User } from "@prisma/client";

export type GameType = {
	id: string;
	started: boolean;
	owner: User;
	ownerId: number;
	player: User;
	playerId: number;
	ownerScore: number;
	playerScore: number;
	winnerId: number;
	accelerator: boolean;
	map: number;
};
