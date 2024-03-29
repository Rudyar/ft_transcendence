import ChatNav from "../../components/Chat/ChatNav/ChatNav";
import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useUser } from "../../context/UserProvider";
import { ChannelModel } from "../../entities/entities";
import { usePrivateRouteSocket } from "../../context/PrivateRouteProvider";
import { useAlert } from "../../context/AlertProvider";
import styles from "./DirectMessages.module.scss";
import trimUserName from "../../utils/trimUserName";

export default function DirectMessages() {
	const { user, isAuth, accessToken } = useUser();
	const [directMessagesState, setDirectMessagesState] = useState<
		ChannelModel[]
	>([]);
	const { chatSocket } = usePrivateRouteSocket();
	const { showAlert } = useAlert();
	const navigate = useNavigate();

	useEffect(() => {
		(async () => {
			try {
				await fetch(
					`${process.env.REACT_APP_BACKEND_URL}/channels/dm/${user.userName}`,
					{
						credentials: "include",
						headers: {
							"Content-Type": "application/json",
							Authorization: `Bearer ${accessToken}`,
						},
					},
				)
					.then((res) => res.json())
					.then((chans) => {
						setDirectMessagesState(chans);
					});
			} catch (e) {}
		})();
	}, [user.userName, accessToken]);

	async function handleBlock(channel: ChannelModel) {
		const room = channel?.title;
		const id = channel?.id;
		const userTopName = user.userName;
		const userTopId = user.id;
		const userList = channel.members;
		const userId1 = userList.at(0)?.id;
		const userId2 = userList.at(1)?.id;
		const userName1 = userList.at(0)?.userName;
		const userName2 = userList.at(1)?.userName;
		let userBottomName = "";
		let userBottomId = 0;
		if (userId1 && userId2 && userName1 && userName2) {
			userBottomId = userId1 === user.id ? userId2 : userId1;
			userBottomName = userName1 === user.userName ? userName2 : userName1;
		}
		const match = user.blockList.filter((el) => {
			return el.id === userBottomId;
		});
		const boolMatch: boolean = match.length > 0 ? true : false;
		if (boolMatch) {
			showAlert("error", userBottomName + " is already blocked.");
			return;
		}
		const mode = "block";
		const data = { userTopName, userTopId, userBottomName, userBottomId };
		const toEmit = { id, room, userTopName, mode };
		try {
			const res = await fetch(
				`${process.env.REACT_APP_BACKEND_URL}/user/block`,
				{
					method: "POST",
					credentials: "include",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${accessToken}`,
					},
					body: JSON.stringify(data),
				},
			);
			chatSocket?.emit("blockUser", toEmit);
			if (res.status === 201) {
				isAuth();
				showAlert("success", "You've just blocked " + userBottomName + ".");
			}
		} catch (e) {
			console.error("Error blocking from user");
		}
	}

	const directMessageList = directMessagesState.map((channel) => {
		const members = channel.members;
		if (members) {
			return members.map((member) => {
				return (
					member.id !== user.id && (
						<li
							className={`${styles.listElems} d-flex justify-content align-items`}
							key={member.id}
							onClick={() => navigate(`/chat/direct_messages/${channel.title}`)}
						>
							<p>{trimUserName(member.userName)}</p>
							<button
								className="btn btn-reverse-danger pl-10 pr-10"
								onClick={(e) => {
									e.stopPropagation();
									handleBlock(channel);
								}}
							>
								Block
							</button>
						</li>
					)
				);
			});
		}
		return <p key={"0"}></p>;
	});

	useEffect(() => {
		const DirectMessagesListener = (chan: ChannelModel) => {
			const {
				id,
				title,
				type,
				mode,
				ownerId,
				members,
				messages,
				operators,
				banList,
				mutedList,
			} = chan;
			setDirectMessagesState([
				...directMessagesState,
				{
					id,
					title,
					type,
					mode,
					ownerId,
					members,
					messages,
					operators,
					banList,
					mutedList,
				},
			]);
		};

		chatSocket?.on("userJoinedDM", DirectMessagesListener);
		chatSocket?.on("receivedDirectMessage", DirectMessagesListener);
		return () => {
			chatSocket?.off("receivedDirectMessage", DirectMessagesListener);
			chatSocket?.off("userJoinedDM", DirectMessagesListener);
		};
	}, [chatSocket, directMessagesState]);

	return (
		<div className="d-flex flex-column align-items justify-content flex-1">
			<div className={`${styles.title} title mt-20`}>Chat</div>
			<ChatNav />
			<div className={`${styles.dmListContainer} mb-20 flex-1`}>
				<h2 className="d-flex justify-content p-10">
					My Private messages ({directMessagesState.length})
				</h2>
				{directMessageList.length ? (
					<ul>{directMessageList}</ul>
				) : (
					<p className="d-flex justify-content align-items m-10">
						No private messages...
					</p>
				)}
			</div>
			<NavLink
				className={`${styles.newDmBtn} btn d-flex flex-column justify-content align-items pl-10 pr-10 p-5`}
				to="/chat/direct_messages/new_dm"
			>
				<div className={styles.buttonText}>New direct message</div>
				<div className={styles.buttonIcon}>
					<i className="fa-solid fa-plus"></i>
				</div>
			</NavLink>
		</div>
	);
}
