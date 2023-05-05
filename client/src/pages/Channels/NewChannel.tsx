import React from "react";

import ChatNav from "../../components/Chat/ChatNav/ChatNav";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../../context/UserProvider";
import Input from "../../components/Input/Input";


type FormValues = {
	title: string;
	mode: string;
	password: string;
    type: string;
    username: string;
};

const initialFormValues: FormValues = {
    title: "",
	mode: "public",
	password: "",
    type: "",
	username: "",
};


export default function NewChannel() {
  
	const { user } = useUser();
	const [radioValue, setRadioValue] = useState("Public");
	const [chanProtected, setChanProtected] = useState(false);
	
    const [formValues, setFormValues] = useState<FormValues>(initialFormValues);
	const navigate = useNavigate();

	function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
		const { name, value } = event.target;
		setFormValues({ ...formValues, [name]: value });
	}

	function handleRadioChange(event:  React.ChangeEvent<HTMLInputElement>) {
		const { value } = event.target;
		if (value === "Protected"){setChanProtected(true)} else {setChanProtected(false)}
		setRadioValue(value);
	}

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
        formValues.username = user.userName;
        formValues.type = "Channel";
		formValues.mode = radioValue;
		if (formValues.mode !== "Protected"){
			formValues.password = "";
		}
		try {
			const res = await fetch("http://localhost:3000/channels/create_channel", {
				method: "POST",
				credentials: "include",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(formValues),
			});
			if (res.status === 201) {
				navigate("/chat/channels");
			} else if (res.ok) {
				navigate("/chat/channels");
            }
		} catch (e) {
			console.error("Error create channel");
		}
	}

return (
		<div className="container d-flex flex-column justify-content align-items">
			<div className="title">Add a new channel</div>
			<div>
				<ChatNav/>
				<form
					onSubmit={handleSubmit}
					className="d-flex flex-column align-items justify-content p-20"
				>
				{/* Radio button to set the mode of the channel */}
				<div className="radio">
				<label>
					<input
					type="radio"
					value="Public"
					checked={radioValue === "Public"}
					onChange={handleRadioChange}
					/>
					Public
				</label>
				</div>
				<div className="radio">
				<label>
					<input
					type="radio"
					value="Private"
					checked={radioValue === "Private"}
					onChange={handleRadioChange}
					/>
					Private
				</label>
				</div>
				<div className="radio">
				<label>
					<input
					type="radio"
					value="Protected"
					checked={radioValue === "Protected"}
					onChange={handleRadioChange}
					/>
					Protected
				</label>
				</div>
				<Input
					icon="fa-solid fa-at"
					type="text"
					name="title"
					placeholder="Title"
					value={formValues.title}
					onChange={handleInputChange}
				/>
				{chanProtected &&
					<>
					<Input
						icon="fa-solid fa-lock"
						type="password"
						name="password"
						placeholder="Password"
						value={formValues.password}
						onChange={handleInputChange}
						/>
					</>
				}
				<div
					className={` d-flex flex-row justify-content-space-between mb-30`}
				>
					<button className="btn-primary" type="submit">
						Create
					</button>
				</div>
			</form>
			</div>
		</div>
	);
}