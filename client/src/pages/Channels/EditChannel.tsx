import ChatNav from "../../components/Chat/ChatNav/ChatNav";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useUser } from "../../context/UserProvider";
import Input from "../../components/Input/Input";
import { useAlert } from "../../context/AlertProvider";
import { ChannelModel } from "../../entities/entities";
import { usePrivateRouteSocket } from "../../context/PrivateRouteProvider";

type FormValues = {
	title: string|undefined;
	mode: string|undefined;
	password: string|undefined;
    type: string|undefined;
    username: string|undefined;
	oldTitle: string | undefined;
};

const initialFormValues: FormValues = {
    title: "title",
	mode: "public",
	password: "",
    type: "Channel",
	username: "",
	oldTitle: ""
};

export default function EditChannel() {
  
	const	[chanProtected, setChanProtected] = useState(false);	
    const	[formValues, setFormValues] = useState<FormValues>(initialFormValues);
	const	[channelState, setChannelState] = useState<ChannelModel>();
	const	{ chatSocket } = usePrivateRouteSocket();
	const	{ accessToken, user } = useUser();
	let		{ title } = useParams();
	const	{ showAlert } = useAlert();
	const	navigate = useNavigate();
	

	
	useEffect(() => {
		(async () => {
			try {
				await fetch(`http://localhost:3000/channels/edit/${title}`, {
					credentials: "include",
					headers: {
						Authorization: `Bearer ${accessToken}`,
					},
				})
				.then((res) => res.json())
				.then(
				(chan) => {
					setChannelState(chan);
				}
				);
            } catch (e) {
			}
        })();
    }, [setChannelState, accessToken, title]);

	function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
		const { name, value } = event.target;

		// Doesn't work for an unknown reason
		setFormValues({ ...formValues, [name]: value });

		// Did that instead
		if (name === "password"){
			const chan = channelState;
			if (chan){
				chan.password = value;
				setChannelState(chan);
			}
		}
		else if (name === "title"){
		const chan = channelState;
			if (chan){
				chan.title = value;
				setChannelState(chan);
			}
		}
	}

	function handleRadioChange(event:  React.ChangeEvent<HTMLInputElement>) {
		const { value } = event.target;
		if (value === "Protected"){setChanProtected(true)} else {setChanProtected(false)}
		const chan = channelState;
			if (chan){
				chan.mode = value;
				setChannelState(chan);
			}
		setFormValues((prevState) =>({
	  		...prevState,
	  		mode: value,
		}));
	}

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		formValues.title = channelState?.title;
		formValues.password= channelState?.password;
		formValues.username = user.userName;
        formValues.oldTitle = title;
        formValues.type = "Channel";
		if (formValues.mode !== "Protected"){
			formValues.password = "";
		}
		console.log("Body: " + channelState?.title + " " + channelState?.type + " " + channelState?.mode + " " + channelState?.password);
		try {
			const res : Response = await fetch("http://localhost:3000/channels/edit_channel", {
				method: "POST",
				credentials: "include",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(formValues),
			});
			if (res.status === 201) {
					showAlert("success", "Channel " + formValues.title + " edited with success");
					chatSocket?.emit("joinChatRoom", formValues.title);
					navigate("/chat/channels");
				}
		} catch (e) {
			console.error("Fatal error");
		}
	}

	let channelForm = null;

	if (channelState){
		const {id, title, password, type, mode} = channelState;
		// Set the formValues
		formValues.title= title;
		formValues.mode= mode;
		formValues.password= password;
		formValues.type=  type;
		formValues.username =  user.userName;

		// Rendering
		channelForm = (
			<>
			<div key={id} className="radio">
				<label>
					<input
					type="radio"
					value="Public"
					checked={formValues.mode === "Public"}
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
					checked={formValues.mode === "Private"}
					onChange={handleRadioChange}
					/>
					Private
				</label>
			</div>
			<div className="radio mb-10">
				<label>
					<input
					type="radio"
					value="Protected"
					checked={formValues.mode === "Protected"}
					onChange={handleRadioChange}
					/>
					Protected
				</label>
			</div>
			{/* <Input
				icon="fa-solid fa-at"
				type="text"
				name="title"
				placeholder="New chan title"
				value={formValues.title}
				onChange={handleInputChange}
			/> */}
			{chanProtected &&
				<>
				<Input
					icon="fa-solid fa-lock"
					type="password"
					name="password"
					placeholder="********"
					value={formValues.password || ""}
					onChange={handleInputChange}
					/>
				</>
			}
			</>
			)
		}	
	
	// = Array.isArray(channelState) ? channelState.map(({ id, title, password, type, mode}) => {


return (
		<div className="container d-flex flex-column justify-content align-items">
			<div className="title">Edit channel</div>
			<div>
				<ChatNav/>
				<form
					onSubmit={handleSubmit}
					className="d-flex flex-column align-items justify-content p-20"
				>
					<>
						{channelForm}
					</>
					<div
						className={` d-flex flex-row justify-content-space-between mb-30`}
						>
						<button className="btn-primary" type="submit">
							Edit
						</button>
					</div>
			</form>
			</div>
		</div>
	);
}