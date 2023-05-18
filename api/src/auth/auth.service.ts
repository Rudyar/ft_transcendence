import {
	ForbiddenException,
	HttpException,
	HttpStatus,
	Injectable,
	Logger,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../prisma/prisma.service";
import { SignupDto, SigninDto, userInfo42Dto } from "./dto";
import * as argon from "argon2";
import { ConfigService } from "@nestjs/config";
import { Response } from "express";
import { UserService } from "../user/user.service";
import { User } from "@prisma/client";

@Injectable()
export class AuthService {
	private readonly logger = new Logger("Authentication");

	constructor(
		private prisma: PrismaService,
		private jwt: JwtService,
		private config: ConfigService,
		private userService: UserService,
	) {}

	async signup(dto: SignupDto, res: Response): Promise<void> {
		let user = await this.userService.getUserByEmail(dto.email);
		if (user) {
			this.logger.error(`${user.email} is already used`);
			throw new ForbiddenException("Credentials taken.");
		} else {
			if ((await this.userService.getUserByUserName(dto.userName)) != null) {
				dto.userName += "_";
			}
			const hash = await argon.hash(dto.password);
			user = await this.prisma.user.create({
				data: {
					hash,
					email: dto.email,
					userName: dto.userName,
					avatar: "",
					wins: 0,
					losses: 0,
				},
			});
			this.logger.log(`New user creation: ${user.userName}`);
			res.status(HttpStatus.CREATED);
		}
		await this.updateRefreshToken(user, res);
	}

	async login(
		dto: SigninDto,
		res: Response,
	): Promise<void | { access_token: string }> {
		const user = await this.userService.getUserByUserName(dto.userName);
		if (user) {
			if (user.email.includes("@student.42.fr"))
				throw new ForbiddenException("42 user, use Login with 42");
			const match = await argon.verify(user.hash, dto.password);
			if (!match) throw new ForbiddenException("Credentials incorrect.");
			if (user.isTfaEnable) {
				res.setHeader("WWW-Authenticate", "TFA");
				return await this.signAccessToken(
					user.userName,
					user.firstName,
					user.lastName,
				);
			} else {
				this.logger.log(`${user.userName} is now online`);
				return await this.updateRefreshToken(user, res);
			}
		} else {
			throw new ForbiddenException("Credentials incorrect.");
		}
	}

	async loginTfa(userName: string, res: Response): Promise<void> {
		const user = await this.userService.getUserByUserName(userName);
		if (!user) throw new ForbiddenException("Can't find user, try again");
		await this.updateRefreshToken(user, res);
		this.logger.log(`${user.userName} with 2fa is now online`);
	}

	logout(res: Response): void {
		res.clearCookie("_jwt");
	}

	async getAuthToken42(code: string): Promise<string> {
		const urlToken = `https://api.intra.42.fr/oauth/token?grant_type=authorization_code&client_id=${this.config.get(
			"CLIENT_42_UID",
		)}&client_secret=${this.config.get(
			"CLIENT_42_SECRET",
		)}&code=${code}&redirect_uri=http%3A%2F%2Flocalhost%3A3001%2Flogin42`;
		const res = await fetch(urlToken, {
			method: "POST",
		});
		if (!res.ok) {
			console.error("Error getAuthToken42 :", code, res.status);
			throw new HttpException("Bad code request", HttpStatus.UNAUTHORIZED);
		}
		const token42 = await res.json();
		return token42.access_token;
	}

	async userInfo42(token42: string): Promise<userInfo42Dto> {
		const res = await fetch("https://api.intra.42.fr/v2/me", {
			headers: {
				Authorization: `Bearer ${token42}`,
			},
		});
		if (!res.ok) {
			throw new HttpException("Can't find 42 user", HttpStatus.NOT_FOUND);
		}
		const { login, email, first_name, last_name, image } = await res.json();
		const imageUrl = image["link"];
		return { login, email, first_name, last_name, image: imageUrl };
	}

	async manageNewAuth42(
		newUser: userInfo42Dto,
		res: Response,
	): Promise<void | { access_token: string }> {
		let user = await this.userService.getUserByEmail(newUser.email);
		if (user) {
			this.logger.log(`${user.userName} from 42 is now online`);
			res.status(HttpStatus.OK);
		} else {
			if ((await this.userService.getUserByUserName(newUser.login)) != null) {
				newUser.login += "_";
			}
			user = await this.userService.createUser42(newUser);
			this.logger.log(`New 42 user creation: ${user.userName}`);
			res.status(HttpStatus.CREATED);
		}
		if (user.isTfaEnable) {
			res.setHeader("WWW-Authenticate", "TFA");
			return await this.signAccessToken(
				user.userName,
				user.firstName,
				user.lastName,
			);
		} else return await this.updateRefreshToken(user, res);
	}

	async newTokens(userClaimEmail: string): Promise<{ access_token: string }> {
		const user = await this.userService.getUserByEmail(userClaimEmail);
		if (!user)
			throw new HttpException("Bad code request", HttpStatus.UNAUTHORIZED);
		return await this.signAccessToken(
			user.userName,
			user.firstName,
			user.lastName,
		);
	}

	////////////////////////////////// JWT

	async updateRefreshToken(user: User, res: Response): Promise<void> {
		const token = await this.signRefreshToken(
			user.id,
			user.email,
			user.createdAt,
		);
		this.createAuthCookie(token.refresh_token, res);
	}

	async signAccessToken(
		userName: string,
		firstName: string,
		lastName: string,
	): Promise<{ access_token: string }> {
		const payload = { sub: userName, firstName, lastName };
		const token = await this.jwt.signAsync(payload, {
			secret: this.config.get<string>("JWT_SECRET"),
		});
		return { access_token: token };
	}

	async signRefreshToken(
		userId: number,
		email: string,
		createdAt: Date,
	): Promise<{ refresh_token: string }> {
		const payload = {
			sub: userId,
			email,
			createdAt,
		};
		const token = await this.jwt.signAsync(payload, {
			expiresIn: "1d",
			secret: this.config.get<string>("JWT_SECRET"),
		});
		return { refresh_token: token };
	}

	createAuthCookie(token: string, res: Response) {
		res.cookie("_jwt", token, {
			sameSite: "strict",
			secure: true,
			httpOnly: true,
			maxAge: 36000000, // 1h=3600000 | 10h=36000000
		});
	}
}
