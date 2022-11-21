import { MAP_SIZE } from "../constants";
import { clamp } from "../utils";
import { CircleHitbox, Hitbox, RectHitbox, Vec2 } from "./maths";
import { GameObject } from "./objects";
import { Weapon } from "./weapons";
import { Fists } from "../store/weapons";
import { MinEntity, MinInventory } from "./minimized";

export interface Animation {
	name: string;
	duration: number;
}

export class Inventory {
	holding: number;
	weapons: Weapon[];
	slots: number;

	constructor(holding: number, slots: number, weapons?: Weapon[]) {
		this.holding = holding;
		this.slots = slots;
		this.weapons = weapons || Array(slots);
	}

	minimize() {
		return <MinInventory> { holding: this.weapons[this.holding].minimize() };
	}
}

export const DEFAULT_EMPTY_INVENTORY = new Inventory(2, 4);
DEFAULT_EMPTY_INVENTORY.weapons[2] = new Fists();

export class Entity {
	type: string = "";
	position: Vec2;
	velocity: Vec2 = Vec2.ZERO;
	direction: Vec2 = Vec2.ONE;
	hitbox: Hitbox = CircleHitbox.ZERO;
	vulnerable = true;
	health: number = 100;
	maxHealth: number = 100;
	despawn = false;
	// Tells the client which animation is going on
	animation: Animation = { name: "", duration: 0 };

	constructor() {
		// Currently selects a random position to spawn. Will change in the future.
		this.position = new Vec2((Math.random() + 1) * MAP_SIZE[0] / 2, (Math.random() + 1) * MAP_SIZE[1] / 2);
	}

	tick(_entities: Entity[], _objects: GameObject[]) {
		// Add the velocity to the position, and cap it at map size.
		this.position = this.position.addVec(this.velocity);
		this.position = new Vec2(clamp(this.position.x, 0, MAP_SIZE[0]), clamp(this.position.y, 0, MAP_SIZE[1]));
		if (this.animation.name) {
			if (this.animation.duration > 0) this.animation.duration--;
			else this.animation.name = "";
		}
	}

	setVelocity(velocity: Vec2) {
		this.velocity = velocity;
	}

	setDirection(direction: Vec2) {
		this.direction = direction.unit();
	}

	// Hitbox collision check
	collided(thing: Entity | GameObject) {
		// For circle it is distance < sum of radii
		if (this.hitbox.type === "circle" && thing.hitbox.type === "circle") return this.position.addVec(thing.position.inverse()).magnitudeSqr() < Math.pow((<CircleHitbox>this.hitbox).radius + (<CircleHitbox>thing.hitbox).radius, 2);
		else if (this.hitbox.type === "rect" && thing.hitbox.type === "rect") {
			// Check for each point to see if it falls into another rectangle
			const thisHalfWidth = (<RectHitbox>this.hitbox).width / 2, thisHalfHeight = (<RectHitbox>this.hitbox).height / 2;
			const thesePoints = [this.position.addX(-thisHalfWidth), this.position.addX(thisHalfWidth), this.position.addY(-thisHalfHeight), this.position.addY(thisHalfHeight)];
			const thatHalfWidth = (<RectHitbox>thing.hitbox).width / 2, thatHalfHeight = (<RectHitbox>thing.hitbox).height / 2;
			const thosePoints = [this.position.addX(-thatHalfWidth), this.position.addX(thatHalfWidth), this.position.addY(-thatHalfHeight), this.position.addY(thatHalfHeight)];

			for (const point of thesePoints) if (thosePoints[0].x < point.x && thosePoints[1].x > point.x && thosePoints[2].y < point.y && thosePoints[3].y > point.y) return true;
			return false;
		} else {
			// https://stackoverflow.com/questions/401847/circle-rectangle-collision-detection-intersection
			// Not the best answer, but good enough.
			if (this.hitbox.type === "circle") return check(this, thing);
			else return check(thing, this);
			function check(circle: Entity | GameObject, rect: Entity | GameObject) {
				const subtracted = circle.position.addVec(rect.position.inverse());
				const cirDist = { x: Math.abs(subtracted.x), y: Math.abs(subtracted.y) };
				const halfWidth = (<RectHitbox>rect.hitbox).width / 2, halfHeight = (<RectHitbox>rect.hitbox).height / 2, radius = (<CircleHitbox>circle.hitbox).radius;

				if (cirDist.x > (halfWidth + radius)) { return false; }
				if (cirDist.y > (halfHeight + radius)) { return false; }

				if (cirDist.x <= halfWidth) { return true; }
				if (cirDist.y <= halfHeight) { return true; }

				return (Math.pow(cirDist.x - halfWidth, 2) + Math.pow(cirDist.y - halfHeight, 2) <= radius * radius);
			}
		}
	}

	damage(dmg: number) {
		if (!this.vulnerable) return;
		this.health -= dmg;
	}

	die() {
		this.despawn = true;
	}

	minimize() {
		return <MinEntity> {
			position: this.position.minimize(),
			direction: this.direction.minimize(),
			hitbox: this.hitbox.minimize(),
			animation: this.animation
		}
	}
}

