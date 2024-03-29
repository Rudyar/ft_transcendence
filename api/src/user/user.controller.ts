import {
	Body,
	Controller,
	Delete,
	FileTypeValidator,
	Get,
	HttpCode,
	HttpException,
	HttpStatus,
	Res,
	MaxFileSizeValidator,
	Param,
	ParseFilePipe,
	Patch,
	StreamableFile,
	UploadedFile,
	UseFilters,
	UseGuards,
	UseInterceptors,
	Post,
} from "@nestjs/common";
import { UserService } from "./user.service";
import { GetCurrentUser } from "../common/decorators";
import { AtGuard } from "../auth/guards";
import { UserNameDto, updateUserNameDto } from "./dto";
import { tfaVerificationCode } from "./dto";
import { FileInterceptor } from "@nestjs/platform-express";
import { NotImageExeptionFilter } from "../common/filters/notImageExeptionFilter.filter";
import { UserInfosType } from "../common/types";
import { Response } from "express";

const parseFileOptions = new ParseFilePipe({
	validators: [
		new MaxFileSizeValidator({ maxSize: 10000000 }),
		new FileTypeValidator({
			fileType: ".(png|jpeg|jpg)",
		}),
	],
	errorHttpStatusCode: HttpStatus.UNSUPPORTED_MEDIA_TYPE,
});

@Controller("user")
export class UserController {
	constructor(private userService: UserService) {}

	@UseGuards(AtGuard)
	@Get("users")
	async getAllUsers(): Promise<{ id: number; userName: string }[]> {
		return await this.userService.getAllUsers();
	}

	@UseGuards(AtGuard)
	@Patch("settings")
	async updateSettings(
		@GetCurrentUser("sub") userName: string,
		@Body() dto: updateUserNameDto,
	): Promise<void> {
		try {
			await this.userService.updateUserName(userName, dto.newUserName);
		} catch (e) {
			throw new HttpException(e.message, e.status);
		}
	}

	@UseGuards(AtGuard)
	@Patch("upload/avatar")
	@UseInterceptors(FileInterceptor("file"))
	@UseFilters(NotImageExeptionFilter)
	async updateAvatar(
		@GetCurrentUser("sub") userName: string,
		@UploadedFile(parseFileOptions)
		file: Express.Multer.File,
	): Promise<void> {
		try {
			await this.userService.uploadAvatar(userName, file);
		} catch (e) {
			throw new HttpException(e.message, e.status);
		}
	}

	@UseGuards(AtGuard)
	@Get("avatar/:username")
	async getUserAvatar(
		@Param() params: UserNameDto,
	): Promise<StreamableFile | String> {
		const user = await this.userService.getUserByUserName(params.username);
		if (!user) throw new HttpException("Error get user avatar", 403);
		return await this.userService.getAvatar(user);
	}

	@UseGuards(AtGuard)
	@Get("infos/:username")
	async getUserInfos(@Param() params: UserNameDto): Promise<UserInfosType> {
		const user = await this.userService.getUserByUserName(params.username);
		if (!user) throw new HttpException("Error get user avatar", 404);
		return {
			userName: user.userName,
			firstName: user.firstName,
			lastName: user.lastName,
			email: user.email,
			status: user.status,
			wins: user.wins,
			losses: user.losses,
			games: await this.userService.getAllGames(user.id),
		};
	}

	@UseGuards(AtGuard)
	@Patch("friend")
	async addToFriend(
		@GetCurrentUser("sub") userName: string,
		@Body() dto: UserNameDto,
	): Promise<void> {
		try {
			await this.userService.addToFriend(userName, dto.username);
		} catch (e) {
			throw new HttpException(e.message, e.status);
		}
	}

	@UseGuards(AtGuard)
	@Delete("friend")
	@HttpCode(HttpStatus.NO_CONTENT)
	async removeFromFriend(
		@GetCurrentUser("sub") userName: string,
		@Body() dto: UserNameDto,
	): Promise<void> {
		try {
			await this.userService.removeFromFriend(userName, dto.username);
		} catch (e) {
			throw new HttpException(e.message, e.status);
		}
	}

	@UseGuards(AtGuard)
	@Get("/tfa/generate")
	async generateTfaQrCode(
		@GetCurrentUser("sub") userName: string,
	): Promise<void> {
		try {
			const otpAuthUrl = await this.userService.generateTfaSecret(userName);
			return this.userService.generateQrCodeDataUrl(otpAuthUrl);
		} catch (e) {
			throw new HttpException(e.message, e.status);
		}
	}

	@UseGuards(AtGuard)
	@Patch("/tfa/enable")
	async enableTfa(
		@GetCurrentUser("sub") userName: string,
		@Body() dto: tfaVerificationCode,
	): Promise<void> {
		const isCodeValid = await this.userService.isTfaCodeValid(
			userName,
			dto.code,
		);
		if (!isCodeValid)
			throw new HttpException(
				"Invalid authentication code",
				HttpStatus.UNAUTHORIZED,
			);
		await this.userService.toggleTfa(userName, true);
	}

	@UseGuards(AtGuard)
	@Patch("/tfa/disable")
	async disableTfa(@GetCurrentUser("sub") userName: string): Promise<void> {
		try {
			await this.userService.removeTfa(userName);
		} catch (e) {
			throw new HttpException(e.message, e.status);
		}
	}

	@UseGuards(AtGuard)
	@Post("block")
	async BlockUser(@Body() body, @Res({ passthrough: true }) res: Response) {
		try {
			await this.userService.blockUser(body.userTopId, body.userBottomId);
			res.status(201);
		} catch (e) {
			throw new HttpException(e.message, e.status);
		}
	}
}
