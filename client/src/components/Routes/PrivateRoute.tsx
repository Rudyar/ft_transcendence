import { ReactElement, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import Loader from "react-loaders";
import Header from "../Header/Header";
import Footer from "../Footer/Footer";
import { useUser } from "../../context";
import { Socket, io } from "socket.io-client";
import { PrivateRouteSocketContext } from "../../context/PrivateRouteProvider";
import { GameSocketContext } from "../../pages/Play/context/GameSocketProvider";
import { Friend } from "../../types";

export default function PrivateRoute(props: {
	element: ReactElement;
	play?: boolean | false;
}): ReactElement {
	const navigate = useNavigate();
	const { user, isAuth, updateOnlineFriend } = useUser();
	const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
	const [socket, setSocket] = useState<Socket | null>(null);
	const [gameSocket, setGameSocket] = useState<Socket | null>(null);
	const [chatSocket, setChatSocket] = useState<Socket | null>(null);

	function connectGameSocket(): Socket {
		const gameSocket = io(`${process.env.REACT_APP_GAME_GATEWAY_URL}`, {
			query: {
				email: user.email,
			},
		});
		gameSocket.once("connectionFail", () => {
			navigate("/login");
			gameSocket.disconnect();
		});
		return gameSocket;
	}

	useEffect(() => {
		const checkAuth = async () => {
			const auth = await isAuth();
			setIsAuthenticated(auth);
		};
		checkAuth();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isAuthenticated]);

	useEffect(() => {
		let appSocket: Socket;
		let chatSocket: Socket;

		if (isAuthenticated !== null && isAuthenticated) {
			appSocket = io(`${process.env.REACT_APP_APP_GATEWAY_URL}`, {
				query: {
					email: user.email,
				},
			});
			appSocket.once("connectionFailed", () => {
				navigate("/login");
			});
			appSocket.on("updateOnlineFriend", (friend: Friend) => {
				updateOnlineFriend(friend);
			});
			setSocket(appSocket);
			chatSocket = io(`${process.env.REACT_APP_CHAT_URL}`, {
				query: {
					email: user.email,
				},
			});
			chatSocket.on("connectionFailed", () => {
				navigate("/login");
			});
			setChatSocket(chatSocket);
		}
		return () => {
			if (chatSocket) chatSocket.disconnect();
			if (appSocket) {
				appSocket.removeAllListeners();
				appSocket.disconnect();
			}
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isAuthenticated, user.email]);

	useEffect(() => {
		let gameSocket: Socket;
		if (isAuthenticated !== null && isAuthenticated && props.play) {
			gameSocket = connectGameSocket();
			setGameSocket(gameSocket);
		}
		return () => {
			if (gameSocket) gameSocket.disconnect();
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isAuthenticated, user.email, props.play]);

	if (isAuthenticated === null) {
		return (
			<Loader
				type="line-scale-pulse-out"
				innerClassName="container d-flex align-items"
				active
			/>
		);
	}

	const elem = (
		<div className="container d-flex justify-content flex-column">
			<Header />
			{props.element}
			<Footer />
		</div>
	);

	return isAuthenticated ? (
		<PrivateRouteSocketContext.Provider value={{ socket, chatSocket }}>
			{props.play ? (
				<GameSocketContext.Provider value={{ gameSocket }}>
					{elem}
				</GameSocketContext.Provider>
			) : (
				elem
			)}
		</PrivateRouteSocketContext.Provider>
	) : (
		<Navigate to="/login" />
	);
}
