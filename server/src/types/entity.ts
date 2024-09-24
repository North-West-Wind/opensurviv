import * as fs from "fs";
import { clamp, ID } from "../utils";
import { CircleHitbox, Hitbox, Line, RectHitbox, Vec2 } from "./math";
import { Obstacle } from "./obstacle";
import { Weapon } from "./weapon";
import { WEAPON_SUPPLIERS } from "../store/weapons";
import { MinEntity, MinInventory } from "./minimized";
import { CollisionType, CountableString, GunColor } from "./misc";
import { world } from "..";
import { CollisionLayers, EntityTypes, PUSH_THRESHOLD } from "../constants";
import { Player } from "../store/entities";
import { IslandrBitStream } from "../packets";
import { Bodies, Body, Composite, Vector } from "matter-js";

export class Inventory {
	// Maximum amount of things.
	static maxAmmos: number[][];
	static maxUtilities: Map<string, number>[];
	static maxHealings: Map<string, number>[];

	holding: number;
	weapons: Weapon[];
	// Indices are colors. Refer to GunColor
	ammos: number[];
	// Utilities. Maps ID to amount of util.
	utilities: CountableString;
	utilOrder = new Set<string>();
	healings: CountableString;
	backpackLevel = 0;
	vestLevel = 0;
	helmetLevel = 0;
	scopes = [1];
	selectedScope = 1;

	constructor(holding: number, weapons?: Weapon[], ammos?: number[], utilities: CountableString = {}, healings: CountableString = {}) {
		this.holding = holding;
		// Hardcoding slots
		this.weapons = weapons || Array(4);
		this.ammos = ammos || Array(Object.keys(GunColor).length / 2).fill(0);
		this.utilities = utilities;
		this.healings = healings;
	}

	static {
		this.maxAmmos = JSON.parse(fs.readFileSync("../data/amount/ammos.json", { encoding: "utf8" }));
		this.maxUtilities = (<any[]>JSON.parse(fs.readFileSync("../data/amount/throwables.json", { encoding: "utf8" }))).map(x => new Map(Object.entries(x)));
		this.maxHealings = (<any[]>JSON.parse(fs.readFileSync("../data/amount/healings.json", { encoding: "utf8" }))).map(x => new Map(Object.entries(x)));
	}

	getWeapon(index = -1) {
		if (index < 0) index = this.holding;
		if (index < this.weapons.length) return this.weapons[index];
		const util = Object.keys(this.utilities)[index - this.weapons.length];
		if (this.utilities[util]) return WEAPON_SUPPLIERS.get(util)!.create();
		return undefined;
	}

	setWeapon(weapon: Weapon, index = -1) {
		if (index < 0) index = this.holding;
		if (index < 3) {this.weapons[index] = weapon; }
	}

	fourthSlot() {
		const util = Array.from(this.utilOrder)[0];
		if (this.utilities[util]) this.weapons[3] = WEAPON_SUPPLIERS.get(util)!.create();
	}

	addScope(scope: number) {
		if (this.scopes.includes(scope)) return false;
		this.scopes.push(scope);
		this.scopes = this.scopes.sort();
		if (this.selectedScope < scope) this.selectScope(scope);
		return true;
	}

	selectScope(scope: number) {
		if (!this.scopes.includes(scope)) return;
		this.selectedScope = scope;
	}

	minimize() {
		return <MinInventory> { holding: this.weapons[this.holding].minimize(), backpackLevel: this.backpackLevel, vestLevel: this.vestLevel, helmetLevel: this.helmetLevel };
		//If the player isn't holding anything no need to minimize it
	}

	static defaultEmptyInventory() {
		const inv = new Inventory(2);
		inv.weapons[2] = WEAPON_SUPPLIERS.get("fists")!.create();
		return inv;
	}
}

export class Entity {
	id: string;
	type = 18;
	position: Vec2;
	velocity: Vec2 = Vec2.ZERO;
	direction: Vec2 = Vec2.UNIT_X;
	hitbox: Hitbox;
	collisionLayers = CollisionLayers.EVERYTHING;
	vulnerable = true;
	_needsToSendAnimations = false
	health = 100;
	maxHealth = 100;
	// If airborne, no effect from terrain
	airborne = false;
	// If discardable, will be removed from memory when despawn
	discardable = false;
	despawn = false;
	interactable = false;
	// Tells the client what animation should play
	animations: string[] = [];
	repelExplosions = false;
	dirty = true;
	potentialKiller?: string;
	// Particle type to emit when damaged
	damageParticle?: string;
	isMobile = false;
	allocBytes = 36;
	goodOldPos = Vec2.ZERO;
	goodOldDirection = Vec2.ZERO;
	surface = "normal";
	readonly actualType = "entity";

	// Matter.js Physics
	bodies: (() => Body)[] = []; // using a supplier to circumvent game packet circular object with msgpack lite TODO
	actualVelocity = Vec2.ZERO;
	
	constructor(hitbox: Hitbox, collisionLayers = CollisionLayers.EVERYTHING) {
		this.id = ID();
		// Currently selects a random position to spawn. Will change in the future.
		this.position = this.goodOldPos = world.size.scale(Math.random(), Math.random());
		this.hitbox = hitbox;
		this.collisionLayers = collisionLayers;
		this.createBodies();
	}

	createBody() {
		if (this.hitbox.type == "rect") return Bodies.rectangle(this.position.x, this.position.y, (<RectHitbox>this.hitbox).width, (<RectHitbox>this.hitbox).height);
		else return Bodies.circle(this.position.x, this.position.y, this.hitbox.comparable);
	}

	createBodies() {
		if (this.collisionLayers == CollisionLayers.EVERYTHING) world.engines.forEach(engine => {
			const body = this.createBody();
			Composite.add(engine.world, body);
			this.bodies.push(() => body);
		});
		else {
			for (let ii = 0; ii < Object.keys(CollisionLayers).length / 2; ii++) {
				if (this.collisionLayers & (1 << ii)) {
					const body = this.createBody();
					Composite.add(world.engines[ii].world, body);
					this.bodies.push(() => body);
				}
			}
		}
	}

	removeBodies() {
		if (this.collisionLayers == CollisionLayers.EVERYTHING) this.bodies.forEach((body, ii) => Composite.remove(world.engines[ii].world, body()));
		else
			for (let ii = 0; ii < Object.keys(CollisionLayers).length / 2; ii++)
				if (this.collisionLayers & (1 << ii))
					Composite.remove(world.engines[ii].world, this.bodies.pop()!());
	}

	setBodies() {
		this.bodies.forEach(body => {
			Body.setPosition(body(), this.position.toMatterVector());
			Body.setAngle(body(), this.direction.angle());
		});
	}

	tick(_entities: Entity[], _obstacles: Obstacle[]) {
		if (!Number.isNaN(this.position.x)) this.goodOldPos = this.position
		if (!Number.isNaN(this.direction.x)) this.goodOldDirection = this.direction
		if (this.animations.length )console.log(this.type, this.animations)
		const lastPosition = this.position;
		// Add the velocity to the position, and cap it at map size.
		if (this.airborne)
			this.actualVelocity = this.velocity;
		else {
			const terrain = world.terrainAtPos(this.position);
			this.actualVelocity = this.velocity.scaleAll(terrain.speed);
			// Also handle terrain damage
			if (terrain.damage != 0 && !(world.ticks % terrain.interval))
				this.damage(terrain.damage);
		}

		// Check health and maybe call death
		if (this.vulnerable && this.health <= 0) this.die();

		if (this.bodies.length) {
			// Set bodies to same position to avoid desync in different worlds
			let totalPosition = Vec2.ZERO;
			this.bodies.forEach(body => totalPosition = totalPosition.addVec(Vec2.fromMatterVector(body().position)));
			//if (this.type == EntityTypes.PLAYER) this.bodies.forEach(body => console.log("body position:", body.position.x, body.position.y));
			const averagePosition = totalPosition.scaleAll(1 / this.bodies.length);
			this.bodies.forEach(body => {
				Body.setPosition(body(), averagePosition.toMatterVector());
				Body.setVelocity(body(), this.actualVelocity.toMatterVector());
			});
			this.position = averagePosition;
		}
		//if (this.type == EntityTypes.PLAYER) console.log("player pos:", this.position.x, this.position.y);
		if (this.position != lastPosition) this.markDirty();
	}

	setVelocity(velocity: Vec2) {
		this.velocity = velocity;
		this.markDirty();
	}

	setDirection(direction: Vec2) {
		if (this.isMobile) { this.direction = direction; }
		else { this.direction = direction.unit(); }
		this.markDirty()
	}

	// Hitbox collision check
	collided(thing: Entity | Obstacle) {
		if (this.id == thing.id || this.despawn) return CollisionType.NONE;
		if (this.collisionLayers != CollisionLayers.EVERYTHING && thing.collisionLayers != CollisionLayers.EVERYTHING && !(this.collisionLayers & thing.collisionLayers)) return CollisionType.NONE;
		if (this.position.distanceTo(thing.position) > this.hitbox.comparable + thing.hitbox.comparable) return CollisionType.NONE;
		// For circle it is distance < sum of radii
		// Reason this doesn't require additional checking: Look up 2 lines
		if (this.hitbox.type === "circle" && thing.hitbox.type === "circle") return CollisionType.CIRCLE_CIRCLE;
		else if (this.hitbox.type === "rect" && thing.hitbox.type === "rect") return this.hitbox.collideRect(this.position, this.direction, <RectHitbox><unknown>thing.hitbox, thing.position, thing.direction);
		else {
			// https://stackoverflow.com/questions/401847/circle-rectangle-collision-detection-intersection
			// Using the chosen answer
			// EDIT: I don't even know if this is the same answer anymore
			let circle: { hitbox: CircleHitbox, position: Vec2, direction: Vec2 };
			let rect: { hitbox: RectHitbox, position: Vec2, direction: Vec2 };
			if (this.hitbox.type === "circle") {
				circle = { hitbox: <CircleHitbox>this.hitbox, position: this.position, direction: this.direction };
				rect = { hitbox: <RectHitbox>thing.hitbox, position: thing.position, direction: thing.direction };
			} else {
				circle = { hitbox: <CircleHitbox>thing.hitbox, position: thing.position, direction: thing.direction };
				rect = { hitbox: <RectHitbox>this.hitbox, position: this.position, direction: this.direction };
			}
			return rect.hitbox.collideCircle(rect.position, rect.direction, circle.hitbox, circle.position, circle.direction);
		}
	}

	damage(dmg: number, damager?: string) {
		if (!this.vulnerable) return;
		this.health -= dmg;
		this.potentialKiller = damager;
		this.markDirty();
	}

	die() {
		this.despawn = true;
		this.health = 0;
		this.removeBodies();
		this.markDirty();
	}

	interact(_player: Player) { }

	interactionKey() {
		return this.translationKey();
	}

	translationKey() {
		return `entity.${this.type}`;
	}

	markDirty() {
		this.dirty = true;
	}
	
	unmarkDirty() {
		this.dirty = false;
	}
	minimize() {
		const a = <MinEntity>{
			id: this.id,
			type: this.type,
			position: this.position.minimize(),
			direction: this.direction.minimize(),
			hitbox: this.hitbox.minimize(),
			animations: this.animations,
			despawn: this.despawn,
			_needsToSendAnimations: this._needsToSendAnimations
		}
		return a
	}
	serialise(stream: IslandrBitStream, player: Player) { }
}

