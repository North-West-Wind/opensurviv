import { world } from "../..";
import { RectHitbox, Vec2 } from "../../types/math";
import { Obstacle } from "../../types/obstacle";
import { LOOT_TABLES } from "../../types/loot_table";
import { MapObstacleSupplier, ObstacleSupplier } from "../../types/supplier";
import { MapObstacleData, ObstacleData } from "../../types/data";
import { MAP_OBSTACLE_SUPPLIERS, OBSTACLE_SUPPLIERS } from ".";
import { CollisionLayers, ObstacleTypes } from "../../constants";

class DeskSupplier extends ObstacleSupplier {
	make(data: ObstacleData) {
		return new Desk();
	}
}

class DeskMapObstacleSupplier extends MapObstacleSupplier {
	make(data: MapObstacleData) {
		return new Desk();
	}
}

export default class Desk extends Obstacle {
	static readonly TYPE = ObstacleTypes.DESK;
	type = Desk.TYPE;
	damageParticle = "wood";

	constructor() {
		var hitbox = new RectHitbox(4, 2);
		var health = 140;
		super(world, hitbox, hitbox.scaleAll(0.75), health, health, CollisionLayers.EVERYTHING, Vec2.UNIT_X);
	}

	static {
		OBSTACLE_SUPPLIERS.set(Desk.TYPE, new DeskSupplier());
		MAP_OBSTACLE_SUPPLIERS.set(Desk.TYPE, new DeskMapObstacleSupplier());
	}

	damage(dmg: number) {
		super.damage(dmg);
		world.onceSounds.push({ path: `obstacles/crate_hit.mp3`, position: this.position });
	}

	die() {
		super.die();
		var lootTable = "toilet_more";
		const entities = LOOT_TABLES.get(lootTable)?.roll();
		if (entities) {
			world.entities.push(...entities.map(e => {
				e.position = this.position;
				e.setBodies();
				return e;
			}));
		}
		world.onceSounds.push({ path: "obstacles/crate_break.mp3", position: this.position });
	}

	minimize() {
		return Object.assign(super.minimize());
	}

	minmin() {
		return Object.assign(super.minmin());
	}
}