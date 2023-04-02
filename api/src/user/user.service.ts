import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { userInfo42Dto } from "../auth/dto";

@Injectable()
export class UserService {
	constructor(private prisma: PrismaService) {}

	async getUserByEmail(email: string) {
		return await this.prisma.user.findUnique({
			where: {
				email: email,
			},
		});
	}

	async getUserByUserName(userName: string) {
		return await this.prisma.user.findUnique({
			where: {
				userName,
			},
		});
	}

	async createUser(newUser: userInfo42Dto) {
		return await this.prisma.user.create({
			data: {
				email: newUser.email,
				userName: newUser.login,
				hash: "sdfgsfgsdfgsfg",
				firstName: newUser.first_name,
				lastName: newUser.last_name,
			},
		});
	}
}
