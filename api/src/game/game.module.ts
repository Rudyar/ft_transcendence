import { Module } from "@nestjs/common";
import { GameController } from "./game.controller";
import { GameService } from "./game.service";
import { UserService } from "../user/user.service";

@Module({
	controllers: [GameController],
	providers: [GameService, UserService],
})
export class GameModule {}
