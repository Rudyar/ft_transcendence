import React, { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import {
	RIGHT_PADDLE,
	LEFT_PADDLE,
	CEILING,
	FLOOR,
	PADDLE_HALF_SIZE,
	BALL_RADIUS,
	OUT_OF_RANGE,
	PADDLE_WIDTH,
	BALL_REBOUND_Y_MULTIPLIER,
	BALL_1ST_REBOUND_X_SPEED_MULTIPLIER,
	BALL_SPAWN_X_SPEED_MULTIPLIER,
} from "../GameUtils/Constant";
import {
	randomBallDir,
	inRange,
	outOfRange,
	ceilToDecimal,
	floorToDecimal,
} from "../GameUtils/Utils";
import { Socket } from "socket.io-client";

const enum Collision {
	NO_HIT,
	OUT_OF_BOUND,
	RIGHT_PADDLE_HIT,
	RIGHT_PADDLE_MISSED,
	LEFT_PADDLE_HIT,
	LEFT_PADDLE_MISSED,
	CEILING_HIT,
	FLOOR_HIT,
}

const enum Paddle {
	LEFT,
	RIGHT,
}

interface BallProps {
	playerPaddle: React.MutableRefObject<
		THREE.Mesh<THREE.BufferGeometry, THREE.Material | THREE.Material[]>
	>;
	ownerPaddle: React.MutableRefObject<
		THREE.Mesh<THREE.BufferGeometry, THREE.Material | THREE.Material[]>
	>;
	socket: Socket | null;
	room: string;
}

export default function BallServer({
	playerPaddle,
	ownerPaddle,
	socket,
	room,
}: BallProps) {
	const [dirVector, setDirVector] = useState(randomBallDir());
	const [xSpeedMultiplier, setXSpeedMultiplier] = useState(
		BALL_SPAWN_X_SPEED_MULTIPLIER,
	);
	const ball = useRef<THREE.Mesh>(null!);

	function newBall(): void {
		ball.current.position.x = 0;
		ball.current.position.y = 0;
		socket!.emit("updateBallPos", {
			position: {
				x: ball.current.position.x,
				y: ball.current.position.y,
			},
			room,
		});
		setDirVector(randomBallDir());
		setXSpeedMultiplier(1);
	}

	function rebound(collision: Collision): { x: number; y: number } {
		switch (collision) {
			case Collision.RIGHT_PADDLE_HIT:
				if (xSpeedMultiplier === BALL_SPAWN_X_SPEED_MULTIPLIER)
					setXSpeedMultiplier(BALL_1ST_REBOUND_X_SPEED_MULTIPLIER);
				return {
					x: -dirVector.x,
					y:
						((ball.current.position.y - ownerPaddle.current.position.y) /
							PADDLE_HALF_SIZE) *
						dirVector.x *
						BALL_REBOUND_Y_MULTIPLIER,
				};
			case Collision.LEFT_PADDLE_HIT:
				if (xSpeedMultiplier === BALL_SPAWN_X_SPEED_MULTIPLIER)
					setXSpeedMultiplier(BALL_1ST_REBOUND_X_SPEED_MULTIPLIER);
				return {
					x: -dirVector.x,
					y:
						((ball.current.position.y - playerPaddle.current.position.y) /
							PADDLE_HALF_SIZE) *
						dirVector.x *
						-BALL_REBOUND_Y_MULTIPLIER,
				};
			case Collision.FLOOR_HIT:
			case Collision.CEILING_HIT:
				return {
					x: dirVector.x,
					y: dirVector.y * -1,
				};
		}
		return {
			x: dirVector.x,
			y: dirVector.y,
		};
	}

	function onPaddle(paddlePosY: number, side: Paddle): Boolean {
		return inRange(
			ball.current.position.y,
			paddlePosY - PADDLE_HALF_SIZE - BALL_RADIUS,
			paddlePosY + PADDLE_HALF_SIZE + BALL_RADIUS,
		)
			? side === Paddle.LEFT
				? ball.current.position.x > LEFT_PADDLE - BALL_RADIUS - PADDLE_WIDTH
				: ball.current.position.x < RIGHT_PADDLE + BALL_RADIUS + PADDLE_WIDTH
			: false;
	}

	// function checkPaddleCollision(): Collision {
	// 	if (
	// 		inRange(
	// 			floorToDecimal(ball.current.position.x + BALL_RADIUS),
	// 			RIGHT_PADDLE,
	// 			RIGHT_PADDLE + PADDLE_WIDTH,
	// 		)
	// 	) {
	// 		return onPaddle(ownerPaddle.current.position.y, Paddle.RIGHT)
	// 			? Collision.RIGHT_PADDLE_HIT
	// 			: Collision.RIGHT_PADDLE_MISSED;
	// 	} else if (
	// 		inRange(
	// 			ceilToDecimal(ball.current.position.x - BALL_RADIUS),
	// 			LEFT_PADDLE,
	// 			LEFT_PADDLE - PADDLE_WIDTH,
	// 		)
	// 	) {
	// 		return onPaddle(playerPaddle.current.position.y, Paddle.LEFT)
	// 			? Collision.LEFT_PADDLE_HIT
	// 			: Collision.LEFT_PADDLE_MISSED;
	// 	}
	// 	return Collision.NO_HIT;
	// }

	function checkPaddleCollision(): Collision {
		if (
			inRange(
				floorToDecimal(ball.current.position.x + BALL_RADIUS),
				RIGHT_PADDLE,
				RIGHT_PADDLE + PADDLE_WIDTH,
			)
		)
			return onPaddle(ownerPaddle.current.position.y, Paddle.RIGHT)
				? Collision.RIGHT_PADDLE_HIT
				: Collision.NO_HIT;
		else if (
			inRange(
				ceilToDecimal(ball.current.position.x - BALL_RADIUS),
				LEFT_PADDLE - PADDLE_WIDTH,
				LEFT_PADDLE,
			)
		)
			return onPaddle(playerPaddle.current.position.y, Paddle.LEFT)
				? Collision.LEFT_PADDLE_HIT
				: Collision.NO_HIT;
		else if (
			inRange(
				floorToDecimal(ball.current.position.x + BALL_RADIUS),
				RIGHT_PADDLE + PADDLE_WIDTH + BALL_RADIUS,
				RIGHT_PADDLE + PADDLE_WIDTH * 2 + BALL_RADIUS,
			)
		)
			return Collision.RIGHT_PADDLE_MISSED;
		else if (
			inRange(
				ceilToDecimal(ball.current.position.x - BALL_RADIUS),
				LEFT_PADDLE - PADDLE_WIDTH * 2 - BALL_RADIUS,
				LEFT_PADDLE - PADDLE_WIDTH - BALL_RADIUS,
			)
		)
			return Collision.LEFT_PADDLE_MISSED;
		return Collision.NO_HIT;
	}

	function checkWallCollision(): Collision {
		return inRange(ceilToDecimal(ball.current.position.y), CEILING, CEILING + 1)
			? Collision.CEILING_HIT
			: inRange(floorToDecimal(ball.current.position.y), FLOOR - 1, FLOOR)
			? Collision.FLOOR_HIT
			: Collision.NO_HIT;
	}

	function checkCollision(): Collision {
		if (outOfRange(ball.current.position.x, -OUT_OF_RANGE, OUT_OF_RANGE))
			return Collision.OUT_OF_BOUND;
		const collision = checkPaddleCollision();
		return collision !== Collision.NO_HIT ? collision : checkWallCollision();
	}

	useFrame((state, delta) => {
		setXSpeedMultiplier(xSpeedMultiplier); // modify so ball speed up
		ball.current.position.x += delta * dirVector.x * xSpeedMultiplier;
		ball.current.position.y += delta * dirVector.y;
		socket!.emit("updateBallPos", {
			position: {
				x: ball.current.position.x,
				y: ball.current.position.y,
			},
			room,
		});
		const collision = checkCollision();
		switch (collision) {
			case Collision.NO_HIT:
				break;
			case Collision.RIGHT_PADDLE_HIT:
				if (dirVector.x > 0) setDirVector(rebound(collision));
				break;
			case Collision.LEFT_PADDLE_HIT:
				if (dirVector.x < 0) setDirVector(rebound(collision));
				break;
			case Collision.FLOOR_HIT:
				if (dirVector.y < 0) setDirVector(rebound(collision));
				break;
			case Collision.CEILING_HIT:
				if (dirVector.y > 0) setDirVector(rebound(collision));
				break;
			case Collision.RIGHT_PADDLE_MISSED:
				socket!.emit("scoreUpdate", { room, ownerScored: false });
				newBall();
				break;
			case Collision.LEFT_PADDLE_MISSED:
				socket!.emit("scoreUpdate", { room, ownerScored: true });
				newBall();
				break;
			// case Collision.OUT_OF_BOUND:
			// 	resetPoint();
			// 	break;
		}
	});

	return (
		<mesh position={[0, 0, 0]} ref={ball}>
			<sphereGeometry args={[BALL_RADIUS]} />

			{/* <boxGeometry args={[PADDLE_WIDTH, PADDLE_WIDTH, PADDLE_WIDTH]} /> */}
			<meshStandardMaterial color="#74b9ff" />
		</mesh>
	);
}
