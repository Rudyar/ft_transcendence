import { Module } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { JwtModule } from "@nestjs/jwt";
import { AuthController } from "./auth.controller";
import { HttpModule } from "@nestjs/axios";
@Module({
	imports: [JwtModule.register({}), HttpModule.register({})],
	controllers: [AuthController],
	providers: [AuthService],
})
export class AuthModule {}
