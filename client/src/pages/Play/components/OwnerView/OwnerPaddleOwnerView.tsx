import React, { useEffect, useState } from "react";
import { useFrame } from "@react-three/fiber";
import {
	BALL_RADIUS,
	CEILING,
	FLOOR,
	MAP_DEPTH,
	PADDLE_CITY_COLOR,
	PADDLE_DEFAULT_COLOR,
	PADDLE_HALF_SIZE,
	PADDLE_HEIGHT,
	PADDLE_SPACE_COLOR,
	PADDLE_SPEED,
	PADDLE_WIDTH,
	PADDLE_X,
} from "../GameUtils/Constant";
import { ceilToDecimal, floorToDecimal } from "../GameUtils/Utils";
import { Socket } from "socket.io-client";
import { MapStatus } from "../../enums/MapStatus";

interface OwnerPaddleProps {
	paddle: React.MutableRefObject<
		THREE.Mesh<THREE.BufferGeometry, THREE.Material | THREE.Material[]>
	>;
	socket: Socket | null;
	room: string;
	map: MapStatus;
}

export default function OwnerPaddle({
	paddle,
	socket,
	room,
	map,
}: OwnerPaddleProps) {
	const [move, setMove] = useState({ up: false, down: false });
	let paddleColor;

	switch (map) {
		case MapStatus.city:
			paddleColor = PADDLE_CITY_COLOR;
			break;
		case MapStatus.space:
			paddleColor = PADDLE_SPACE_COLOR;
			break;
		default:
			paddleColor = PADDLE_DEFAULT_COLOR;
			break;
	}

	useEffect(() => {
		socket!.on("resetPaddles", () => {
			paddle.current.position.y = 0;
		});
		return () => {
			socket!.off("resetPaddles");
		};
	});

	useFrame((state, delta) => {
		if (
			move.up &&
			ceilToDecimal(paddle.current.position.y + PADDLE_HALF_SIZE) < CEILING
		) {
			paddle.current.position.y += delta * PADDLE_SPEED;
			socket!.emit("updateOwnerPaddlePos", {
				y: paddle.current.position.y,
				room,
			});
		} else if (
			move.down &&
			floorToDecimal(paddle.current.position.y - PADDLE_HALF_SIZE) > FLOOR
		) {
			paddle.current.position.y -= delta * PADDLE_SPEED;
			socket!.emit("updateOwnerPaddlePos", {
				y: paddle.current.position.y,
				room,
			});
		}
	});

	function handleKeyDown(e: KeyboardEvent): void {
		switch (e.key) {
			case "ArrowUp":
				setMove({ up: true, down: false });
				break;
			case "ArrowDown":
				setMove({ up: false, down: true });
				break;
		}
	}

	function handleKeyUp(e: KeyboardEvent): void {
		switch (e.key) {
			case "ArrowUp":
				setMove({ up: false, down: false });
				break;
			case "ArrowDown":
				setMove({ up: false, down: false });
				break;
		}
	}

	useEffect(() => {
		document.addEventListener("keydown", handleKeyDown);
		document.addEventListener("keyup", handleKeyUp);
	}, []);

	return (
		<mesh position={[PADDLE_X + BALL_RADIUS, 0, 0]} ref={paddle}>
			<boxGeometry args={[PADDLE_WIDTH, PADDLE_HEIGHT, MAP_DEPTH]} />
			<meshStandardMaterial color={paddleColor} />
		</mesh>
	);
}
