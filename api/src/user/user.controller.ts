import { Controller, Get } from "@nestjs/common";
import { UserService } from "./user.service";

@Controller("user")
export class UserController {
	constructor(private userService: UserService) {}

	// @Get('all')
	// getHelloUser(): any {
	// 	// return 'Hello User';
	// 	return this.userService.getHelloUser();
	// }
}