import { createContext, useContext, useState } from "react";
import { isAuthRequest, logoutRequest } from "../api";
import { UserStatus, Friend } from "../types";

type UserContextValue = {
	isAuth: () => Promise<boolean>;
	logout: () => void;
	updateOnlineFriend: (friend: Friend) => void;
	accessToken: string;
	user: {
		id: number;
		userName: string;
		email: string;
		firstName: string;
		lastName: string;
		isTfaEnable: boolean;
		status: UserStatus;
		friends: Friend[];
	};
};

const UserContext = createContext<UserContextValue>({
	isAuth: async () => false,
	logout: () => {},
	updateOnlineFriend: (friend: Friend) => {},
	accessToken: "",
	user: {
		id: 0,
		userName: "",
		email: "",
		firstName: "",
		lastName: "",
		isTfaEnable: false,
		status: UserStatus.ONLINE,
		friends: [],
	},
});

type UserProviderProps = {
	children: React.ReactNode;
};

export type UserDataState = {
	id: number;
	userName: string;
	email: string;
	firstName: string;
	lastName: string;
	isTfaEnable: boolean;
	status: UserStatus;
	friends: Friend[];
};

export const UserProvider = ({ children }: UserProviderProps) => {
	const [accessToken, setAccessToken] = useState<string>("");
	const [user, setUser] = useState<UserDataState>({
		id: 0,
		userName: "",
		email: "",
		firstName: "",
		lastName: "",
		isTfaEnable: false,
		status: UserStatus.ONLINE,
		friends: [],
	});

	const isAuth = async (): Promise<boolean> => {
		const res = await isAuthRequest();
		if (res && res.ok) {
			if (res.status === 204) {
				return false;
			}
			const data = await res.json();
			setAccessToken(data.accessToken);
			setUser(data.userData);
			return true;
		} else {
			if (accessToken) logout();
			setAccessToken("");
			return false;
		}
	};

	const logout = async (): Promise<void> => {
		logoutRequest(accessToken);
		setAccessToken("");
	};

	const updateOnlineFriend = (friend: Friend) => {
		const newFriendsList = [
			...user.friends.filter((f) => f.id !== friend.id),
			friend,
		];
		newFriendsList.sort((a: Friend, b: Friend) =>
			a.userName.localeCompare(b.userName),
		);
		setUser({ ...user, friends: newFriendsList });
	};

	return (
		<UserContext.Provider
			value={{ isAuth, logout, updateOnlineFriend, accessToken, user }}
		>
			{children}
		</UserContext.Provider>
	);
};

export const useUser = () => useContext(UserContext);
