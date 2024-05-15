export enum CollisionType {
	// No intersection
	NONE = 0,
	// Circle-circle intersection
	CIRCLE_CIRCLE = 1,
	// Rectangle-rectangle intersection
	RECT_RECT = 2,
	// Circle-rectangle intersection, with the circle's center inside the rectangle
	CIRCLE_RECT_CENTER_INSIDE = 3,
	// Circle-rectangle intersection, with point(s) of the rectangle inside the circle
	CIRCLE_RECT_POINT_INSIDE = 4,
	// Circle-rectangle intersection, with line(s) of the rectangle inside the circle
	CIRCLE_RECT_LINE_INSIDE = 5
}

// The 4 movement directions
export enum MovementDirection {
	RIGHT = 0,
	UP = 1,
	LEFT = 2,
	DOWN = 3
}

export enum GunColor {
	YELLOW = 0, // 9mm
	RED = 1, // 12 gauge
	BLUE = 2, // 7.62mm
	GREEN = 3, // 5.56mm
	OLIVE = 5, // .308 Subsonic
}

export type CountableString = {
	[key: string]: number;
}