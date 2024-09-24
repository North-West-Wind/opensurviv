import { world } from "../..";
import { RectHitbox, Vec2 } from "../../types/math";
import { Obstacle } from "../../types/obstacle";
import { LOOT_TABLES } from "../../types/loot_table";
import { MapObstacleSupplier, ObstacleSupplier } from "../../types/supplier";
import { MapObstacleData, ObstacleData } from "../../types/data";
import { MAP_OBSTACLE_SUPPLIERS, OBSTACLE_SUPPLIERS } from ".";
import { CollisionLayers, ObstacleTypes } from "../../constants";

class CrateSupplier extends ObstacleSupplier {
	make(data: ObstacleData) {
		return new Crate(data.special || "normal");
	}
}

class CrateMapObstacleSupplier extends MapObstacleSupplier {
	make(data: MapObstacleData) {
		return new Crate(data.args ? data.args[0] : "normal");
	}
}

export default class Crate extends Obstacle {
	static TYPE = ObstacleTypes.CRATE;
	type = Crate.TYPE;
	special: string;
	damageParticle = "wood";

	constructor(special = "normal") {
		var hitbox: RectHitbox;
		var health: number;
		switch (special) {
			case "grenade":
				hitbox = new RectHitbox(3, 3);
				health = 100;
				break;
			case "soviet":
				hitbox = new RectHitbox(4, 4);
				health = 125;
				break;
			case "woodpile":
				hitbox = new RectHitbox(3, 3);
				health = 200;
				break;
			default:
				hitbox = new RectHitbox(4, 4);
				health = 80;
				break;
		}
		super(world, hitbox, hitbox.scaleAll(0.75), health, health, CollisionLayers.EVERYTHING, Vec2.UNIT_X);
		this.special = special;
	}

	static {
		OBSTACLE_SUPPLIERS.set(Crate.TYPE, new CrateSupplier());
		MAP_OBSTACLE_SUPPLIERS.set(Crate.TYPE, new CrateMapObstacleSupplier());
	}

	damage(dmg: number) {
		super.damage(dmg);
		//world.onceSounds.push({ path: `obstacles/crate_hit.mp3`, position: this.position });
	}

	die() {
		super.die();
		if (this.special != "woodpile") {
			var lootTable: string;
			switch (this.special) {
				case "grenade":
					lootTable = "crate_grenade";
					break;
				case "soviet":
					lootTable = "crate_more";
					break;
				default:
					lootTable = "crate";
					break;
			}
			const entities = LOOT_TABLES.get(lootTable)?.roll();
			if (entities) {
				world.entities.push(...entities.map(e => {
					e.position = this.position;
					e.setBodies();
					return e;
				}));
			}
		}
		//world.onceSounds.push({ path: "obstacles/crate_break.mp3", position: this.position });
	}

	minimize() {
		return Object.assign(super.minimize(), { special: this.special });
	}

	minmin() {
		return Object.assign(super.minmin(), { special: this.special });
	}
}