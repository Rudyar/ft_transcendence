import { Body, Controller, Post } from "@nestjs/common";
import { GameService } from "./game.service";
import { createGameDto } from "./dto";

@Controller("game")
export class GameController {}
