import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./LoginForm.module.scss";
import Input from "../../Input/Input";

type FormValues = {
	userName: string;
	password: string;
};

const initialFormValues: FormValues = {
	userName: "",
	password: "",
};

export default function LoginForm() {
	const [formValues, setFormValues] = useState<FormValues>(initialFormValues);
	const navigate = useNavigate();

	function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
		const { name, value } = event.target;
		setFormValues({ ...formValues, [name]: value });
	}

	async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (formValues.password === "" || formValues.userName === "") return;
		try {
			const response = await fetch("http://localhost:3000/auth/login", {
				method: "POST",
				credentials: "include",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(formValues),
			});
			if (!response.ok) {
				alert("Credentials incorrect");
			} else {
				navigate("/");
			}
		} catch (e) {
			console.error("Error login classic");
		}
	}

	return (
		<div className={styles.formContainer}>
			<form
				onSubmit={handleSubmit}
				className="d-flex flex-column align-items justify-content"
			>
				<Input
					icon="fa-solid fa-user"
					type="text"
					name="userName"
					placeholder="Username"
					value={formValues.userName}
					onChange={handleInputChange}
				/>
				<Input
					icon="fa-solid fa-lock"
					type="password"
					name="password"
					placeholder="Password"
					value={formValues.password}
					onChange={handleInputChange}
				/>
				<div
					className={`${styles.buttonContainer} d-flex flex-row justify-content-space-between mb-10`}
				>
					<button
						className="btn-reverse-primary"
						type="button"
						onClick={() => {
							navigate("/signup");
						}}
					>
						Signup
					</button>
					<button className="btn-primary" type="submit">
						Login
					</button>
				</div>
			</form>
		</div>
	);
}
