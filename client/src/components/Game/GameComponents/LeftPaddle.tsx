import React, { useEffect, useState } from "react";
import { useFrame } from "@react-three/fiber";
import {
	BALL_RADIUS,
	CEILING,
	FLOOR,
	PADDLE_HALF_SIZE,
	PADDLE_HEIGHT,
	PADDLE_SPEED,
	PADDLE_X,
} from "../Constant";
import { ceilToDecimal, floorToDecimal } from "./Utils";

interface LeftPaddleProps {
	paddle: React.MutableRefObject<
		THREE.Mesh<THREE.BufferGeometry, THREE.Material | THREE.Material[]>
	>;
}

export default function LeftPaddle({ paddle }: LeftPaddleProps) {
	const [move, setMove] = useState({ up: false, down: false });

	useFrame((state, delta) => {
		if (
			move.up &&
			ceilToDecimal(paddle.current.position.y + PADDLE_HALF_SIZE) < CEILING
		)
			paddle.current.position.y += delta * PADDLE_SPEED;
		else if (
			move.down &&
			floorToDecimal(paddle.current.position.y - PADDLE_HALF_SIZE) > FLOOR
		)
			paddle.current.position.y -= delta * PADDLE_SPEED;
	});

	function handleKeyDown(e: KeyboardEvent): any {
		switch (e.key) {
			case "w":
				setMove({ up: true, down: false });
				break;
			case "s":
				setMove({ up: false, down: true });
				break;
		}
	}

	function handleKeyUp(e: KeyboardEvent): any {
		switch (e.key) {
			case "w":
				setMove({ up: false, down: false });
				break;
			case "s":
				setMove({ up: false, down: false });
				break;
		}
	}

	useEffect(() => {
		document.addEventListener("keydown", handleKeyDown);
		document.addEventListener("keyup", handleKeyUp);
	}, []);

	return (
		<mesh position={[-PADDLE_X - BALL_RADIUS, 0, 0]} ref={paddle}>
			<boxGeometry args={[0.1, PADDLE_HEIGHT, 0.1]} />
			<meshStandardMaterial color="#74b9ff" />
		</mesh>
	);
}
