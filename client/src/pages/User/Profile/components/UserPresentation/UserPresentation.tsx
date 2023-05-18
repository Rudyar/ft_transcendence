import { useNavigate } from "react-router-dom";
import { useAlert, useUser } from "../../../../../context";
import styles from "./UserPresentation.module.scss";
import { toggleFriendshipRequest } from "../../../../../api";
import { UserStatus } from "../../../../../types/UserStatus.enum";

type UserProfileProps = {
	userProfile: {
		userName: string;
		firstName: string;
		lastName: string;
		email: string;
		status: UserStatus;
	};
	userProfileAvatar: string;
	isFriend: boolean;
};

const UserPresentation = ({
	userProfile,
	userProfileAvatar,
	isFriend,
}: UserProfileProps) => {
	const { accessToken, isAuth, user } = useUser();
	const { showAlert } = useAlert();
	const navigate = useNavigate();
	const { userName, firstName, lastName, email, status } = userProfile;

	async function toggleFriendship() {
		const method = isFriend ? "DELETE" : "PATCH";
		try {
			const res = await toggleFriendshipRequest(accessToken, userName, method);
			if (method === "DELETE" && res.status === 204) {
				await isAuth();
				showAlert("warning", "Removed from friends");
			} else if (res.ok) {
				await isAuth();
				showAlert("info", "Added to friends");
			} else showAlert("error", "A problem occured, try again later");
		} catch (e) {
			console.error("Error remove from friend: ", e);
			showAlert("error", "A problem occured, try again later");
		}
	}

	return (
		<div className={`${styles.presentationContainer} d-flex flex-column`}>
			<div className={styles.avatarContainer}>
				<img src={userProfileAvatar} alt="" />
				{isFriend || user.userName === userName ? (
					<div
						className={`${styles.statusBadge} ${
							status === UserStatus.ONLINE
								? styles.online
								: status === UserStatus.INGAME
								? styles.ingame
								: styles.offline
						}`}
					></div>
				) : (
					<></>
				)}
				<div className={`${styles.userInfosTextContainer}`}>
					{firstName && lastName ? (
						<h1 className="mt-10">
							{firstName} {lastName}
						</h1>
					) : (
						<h1 className="mt-10">No name...</h1>
					)}
					<h3 className="mt-5">{email}</h3>
				</div>
			</div>
			{user.userName !== userName ? (
				isFriend ? (
					<button
						className="btn btn-reverse-danger p-5 mt-20"
						onClick={toggleFriendship}
					>
						Unfollow
					</button>
				) : (
					<button
						className="btn btn-reverse-primary p-5 mt-20"
						onClick={toggleFriendship}
					>
						Follow
					</button>
				)
			) : (
				<button
					className="btn btn-reverse-primary p-5 mt-20"
					onClick={() => navigate("/settings")}
				>
					My settings
				</button>
			)}
		</div>
	);
};

export default UserPresentation;
