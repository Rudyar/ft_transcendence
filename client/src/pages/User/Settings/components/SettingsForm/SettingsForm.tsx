import { useState } from "react";
import styles from "./SettingsForm.module.scss";
import Input from "../../../../../components/Input/Input";
import TfaModal from "../TfaModal/TfaModal";
import { useAlert, useUser } from "../../../../../context";
import {
	disableTfaRequest,
	generateQrCodeRequest,
	settingsRequest,
} from "../../../../../api";
import { usePrivateRouteSocket } from "../../../../../context/PrivateRouteProvider";

export default function SettingsForm() {
	const { accessToken, user, isAuth } = useUser();
	const { socket } = usePrivateRouteSocket();
	const { showAlert } = useAlert();
	const [newUserName, setNewUserName] = useState<string>(user.userName);
	const [tfaModal, setTfaModal] = useState<boolean>(false);
	const [qrCodeContent, setQrCodecontent] = useState<string>("");

	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		if (newUserName === user.userName || !newUserName.length) return;
		try {
			const res = await settingsRequest(accessToken, newUserName);
			if (!res.ok) {
				const data = await res.json();
				showAlert("error", data.message);
			} else {
				await isAuth();
				showAlert("success", "Profile updated");
				socket?.emit("userNameUpdated", newUserName);
			}
		} catch (e) {
			console.error("Error update userName", e);
		}
	}

	async function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
		setNewUserName(e.target.value);
	}

	async function generateQrCode() {
		try {
			const res = await generateQrCodeRequest(accessToken);
			if (res.ok) {
				setQrCodecontent(await res.text());
			} else showAlert("error", "Can't generate QrCode, try again later");
		} catch (e) {
			console.error("Error generate Qr Code: ", e);
		}
		setTfaModal(true);
	}

	async function disableTfa() {
		try {
			const res = await disableTfaRequest(accessToken);
			if (res.ok) {
				await isAuth();
				showAlert("info", "TFA is now disable");
			} else showAlert("error", "Can't disable TFA, try again later");
		} catch (e) {
			console.error("Error disable tfa: ", e);
		}
	}

	return (
		<>
			<form
				onSubmit={handleSubmit}
				className={`${styles.settingsForm} d-flex flex-column align-items justify-content}`}
			>
				<Input
					icon="fa-solid fa-user"
					type="text"
					name="userName"
					placeholder="Username"
					value={newUserName}
					onChange={handleInputChange}
				/>

				<label className={styles.disabledField}>
					<i className="fa-solid fa-envelope"></i>
					<input value={user.email} disabled />
				</label>

				<label className={styles.disabledField}>
					<i className="fa-solid fa-user"></i>
					<input value={user.firstName ? user.firstName : "Denis"} disabled />
				</label>

				<label className={styles.disabledField}>
					<i className="fa-solid fa-user"></i>
					<input value={user.lastName ? user.lastName : "Brognard"} disabled />
				</label>

				<div className={"d-flex flex-row justify-content-space-between mt-10"}>
					<button className="btn-primary p-5 m-5" type="submit">
						Update changes
					</button>
					{user.isTfaEnable ? (
						<button
							className="btn-danger p-5 m-5"
							type="button"
							onClick={disableTfa}
						>
							Disable 2FA
						</button>
					) : (
						<button
							className="btn-reverse-primary p-5 m-5"
							type="button"
							onClick={generateQrCode}
						>
							Enable 2FA
						</button>
					)}
				</div>
			</form>
			{tfaModal && (
				<TfaModal
					closeModal={() => setTfaModal(false)}
					qrCodeUrl={qrCodeContent}
				/>
			)}
		</>
	);
}
