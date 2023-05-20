import { createContext, useContext, useEffect, useState } from "react";
import { usePrivateRouteSocket } from "./PrivateRouteProvider";
import {
	AlertContextType,
	AlertProps,
	AlertProviderProps,
	AlertType,
	InviteProps,
} from "../types";

export const ALERT_TIMEOUT = 3000;
export const INVITE_TIMEOUT = 3000; // 15000

function initialAlertState() {
	const storedAlert = localStorage.getItem("alert");
	if (storedAlert) return JSON.parse(storedAlert);
	return null;
}

function initialInviteState() {
	const storedInvite = localStorage.getItem("invite"); // Not sure if it's secure
	if (storedInvite) return JSON.parse(storedInvite);
	return null;
}

const AlertContext = createContext<AlertContextType>({
	showAlert: () => {},
	showInvite: () => {},
});

export const AlertProvider = ({ children }: AlertProviderProps) => {
	const [alert, setAlert] = useState<AlertProps | null>(initialAlertState());
	const [isHiddenAlert, setIsHiddenAlert] = useState<boolean>(true);
	const [invite, setInvite] = useState<InviteProps | null>(
		initialInviteState(),
	);
	const [isHiddenInvite, setIsHiddenInvite] = useState<boolean>(true);
	const { socket } = usePrivateRouteSocket();

	const showAlert = (type: AlertType, message: string) => {
		setAlert({ type, message });
		setIsHiddenAlert(false);
		localStorage.setItem("alert", JSON.stringify({ type, message }));
	};

	const showInvite = (props: InviteProps) => {
		setInvite({ ...props });
		setIsHiddenInvite(false);
		localStorage.setItem("invite", JSON.stringify({ ...props }));
	};

	useEffect(() => {
		let timeoutId: NodeJS.Timeout;
		if (alert) {
			setIsHiddenAlert(false);
			timeoutId = setTimeout(() => {
				setIsHiddenAlert(true);
				setAlert(null);
				localStorage.removeItem("alert");
			}, ALERT_TIMEOUT);
		}
		return () => {
			if (timeoutId) clearTimeout(timeoutId);
		};
	}, [alert]);

	useEffect(() => {
		let timeoutId: NodeJS.Timeout;
		if (invite) {
			setIsHiddenInvite(false);
			timeoutId = setTimeout(() => {
				setIsHiddenInvite(true);
				setInvite(null);
				localStorage.removeItem("invite");
			}, INVITE_TIMEOUT);
		}
		return () => {
			if (timeoutId) clearTimeout(timeoutId);
		};
	}, [invite]);

	return (
		<AlertContext.Provider value={{ showAlert, showInvite }}>
			{alert && !isHiddenAlert && (
				<div
					className={`alert alert-${alert.type} ${isHiddenAlert ? "hide" : ""}`}
				>
					{alert.message}
				</div>
			)}
			{invite && !isHiddenInvite && (
				<div
					className={`d-flex flex-column alert alert-info${
						isHiddenInvite ? "hide" : ""
					}`}
				>
					{invite.senderUserName} invites you to play.
					<div className="d-flex flex-row align-items justify-content mt-10">
						<button className="btn btn-success p-5 mr-10">Accept</button>
						<button className="btn btn-danger p-5">Decline</button>
					</div>
				</div>
			)}
			{children}
		</AlertContext.Provider>
	);
};

export const useAlert = () => useContext(AlertContext);
