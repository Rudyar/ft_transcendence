import { useEffect, useState } from "react";
import Input from "../../../../../components/Input/Input";
import styles from "./TfaModal.module.scss";
import { enableTfaRequest } from "../../../../../api";
import { useAlert, useUser } from "../../../../../context";

interface ModalProps {
	closeModal: () => void;
	qrCodeUrl: string;
}

export default function TfaModal({ closeModal, qrCodeUrl }: ModalProps) {
	const [inputValue, setInputValue] = useState<string>("");
	const { accessToken, isAuth } = useUser();
	const { showAlert } = useAlert();

	async function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
		setInputValue(e.target.value);
	}

	async function handleSubmit() {
		if (inputValue === "") return;
		const verificationCode = inputValue.replace(/\s/g, "");
		try {
			const res = await enableTfaRequest(accessToken, verificationCode);
			if (res.ok) {
				await isAuth();
				showAlert("info", "TFA is now enable");
				closeModal();
			} else {
				const body = await res.json();
				showAlert("error", body.message);
			}
		} catch (e) {
			console.error("Error sending qrCode verification values", e);
		}
	}

	useEffect(() => {
		function handleKeyPress(event: KeyboardEvent) {
			if (event.key === "Enter") {
				handleSubmit();
			}
		}
		window.addEventListener("keypress", handleKeyPress);
		return () => {
			window.removeEventListener("keypress", handleKeyPress);
		};
	});

	return (
		<div className={styles.modalContainer} onClick={closeModal}>
			<div
				className={styles.modalContent}
				onClick={(e) => {
					e.stopPropagation();
				}}
			>
				<h3>Configure 2FA</h3>
				<div className="mt-10 mb-20 d-flex flex-column align-items justify-content">
					<img src={qrCodeUrl} alt="qr code" />
					<small className="mt-5 d-flex justify-content">
						Scan the Qr Code with your favorite 2FA app
					</small>
				</div>
				<Input
					icon="fa-solid fa-key"
					type="text"
					name="userName"
					placeholder="Ex: 123456"
					value={inputValue}
					onChange={handleInputChange}
				/>
				<div className="d-flex flex-row mt-5">
					<button
						className="btn btn-primary p-5"
						type="submit"
						onClick={handleSubmit}
					>
						Validate
					</button>
					<button
						className="btn btn-reverse-danger p-5 ml-10"
						onClick={closeModal}
					>
						Close
					</button>
				</div>
			</div>
		</div>
	);
}
