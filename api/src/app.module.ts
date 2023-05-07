import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { PrismaService } from "./prisma/prisma.service";
import { ServerGateway } from "./server/server.gateway";
import { PrismaModule } from "./prisma/prisma.module";
import { UserModule } from "./user/user.module";
import { AuthModule } from "./auth/auth.module";
import { ConfigModule } from "@nestjs/config";
import { GameGateway } from "./game/game.gateway";
import { UserService } from "./user/user.service";
import { AppGateway } from "./app.gateway";

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
		}),
		PrismaModule,
		UserModule,
		AuthModule,
	],
	controllers: [AppController],
	providers: [
		AppService,
		PrismaService,
		AppGateway,
		GameGateway,
		ServerGateway,
		UserService,
	],
})
export class AppModule {}
