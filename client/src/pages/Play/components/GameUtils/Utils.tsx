import { BALL_X_SPEED } from "./Constant";

export function randomBallDir(): { x: number; y: number } {
	return {
		x: Math.round(Math.random()) === 1 ? BALL_X_SPEED : -BALL_X_SPEED,
		y: Math.random() - 0.5,
	};
}

export function ceilToDecimal(n: number): number {
	return Math.ceil((n + Number.EPSILON) * 100) / 100;
}

export function floorToDecimal(n: number): number {
	return Math.floor((n + Number.EPSILON) * 100) / 100;
}

export function inRange(n: number, min: number, max: number): Boolean {
	return n >= min && n <= max;
}

export function outOfRange(n: number, min: number, max: number): Boolean {
	return n < min || n > max;
}
