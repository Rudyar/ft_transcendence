import { UserStatus } from "./UserStatus.enum";

export type NewUserName = {
	id: number;
	userName: string;
	status: UserStatus;
};

export type Friend = NewUserName;
