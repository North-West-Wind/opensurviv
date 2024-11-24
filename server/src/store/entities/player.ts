import { world } from "../..";
import { GLOBAL_UNIT_MULTIPLIER, TICKS_PER_SECOND } from "../../constants";
import { Entity, Inventory } from "../../types/entity";
import { CircleHitbox, Vec2 } from "../../types/math";
import { CollisionType, GunColor } from "../../types/misc";
import { Obstacle } from "../../types/obstacle";
import { Particle } from "../../types/particle";
import { GunWeapon, Weapon, WeaponType } from "../../types/weapon";
import { addKillCounts, changeCurrency, spawnAmmo, spawnGun } from "../../utils";
import { Roof } from "../obstacles";
import { Pond, River, Sea } from "../terrains";
import Backpack from "./backpack";
import Healing from "./healing";
import Helmet from "./helmet";
import Vest from "./vest";
export default class Player extends Entity {
	type = "player";
	currentHealItem: string | null;
	interactMessage: string | null;
	hitbox = new CircleHitbox(1);
	waitingForReload = false;
	id: string;
	username: string;
	collisionLayers = [0];
	lastPickedUpScope = 1
	boost = 0;
	maxBoost = 100;
	scope = 1;
	changedScope = false;
	buildingEnterScope = 1;
	_scope = 1;
	tryAttacking = false;
	attackLock = 0;
	tryInteracting = false;
	canInteract = false;
	inventory: Inventory;
	//for ammos and all dat 
	pickedAmmo = false;
	ammoChanged!: string;
	numberOfAmmo!: string;
	// Last held weapon. Used for tracking weapon change
	lastHolding = "fists";
	normalVelocity = Vec2.ZERO;

	// Track reloading ticks
	reloadTicks = 0;
	maxReloadTicks = 0;
	// Track healing item usage ticks
	healTicks = 0;
	maxHealTicks = 0;
	healItem: string | undefined = undefined;
	skin: string | null;
	deathImg: string | null;
	isMobile = false
	// Track zone damage ticks
	zoneDamageTicks = 2 * TICKS_PER_SECOND;
	// Track ripple particle ticks
	rippleTicks = 0;

	// Server-side only
	accessToken?: string;
	killCount = 0;
	currencyChanged = false;

	constructor(id: string, username: string, skin: string | null, deathImg: string | null, accessToken?: string, isMobile?: boolean) {
		super();
		this.id = id;
		this.interactMessage = null;
		this.username = username;
		this.skin = skin;
		this.deathImg = deathImg
		console.log("from player.ts server skin > " + this.skin + " and death image = " + this.deathImg)
		this.inventory = Inventory.defaultEmptyInventory();
		this.currentHealItem = null;
		this.accessToken = accessToken;
		this.isMobile = isMobile!;
	}

	setVelocity(velocity?: Vec2) {
		if (!velocity) velocity = this.normalVelocity;
		else this.normalVelocity = velocity;
		// Also scale the velocity to boost by soda and pills, and weight by gun
		const weapon = this.inventory.getWeapon()!;
		velocity = velocity.scaleAll((this.attackLock > 0 ? weapon.attackSpeed : weapon.moveSpeed) + (this.boost >= 50 ? 1.85 : 0));
		if (this.healTicks) velocity = velocity.scaleAll(0.5);
		velocity = velocity.scaleAll(GLOBAL_UNIT_MULTIPLIER / TICKS_PER_SECOND);
		super.setVelocity(velocity);
	}

	tick(entities: Entity[], obstacles: Obstacle[]) {
		// When the player dies, don't tick anything
		if (this.despawn) return;
		// Decrease boost over time
		if (this.boost > 0) {
			this.boost -= 0.375 / TICKS_PER_SECOND;
			if (this.boost < 0) this.boost = 0;
			else if (this.health < this.maxHealth) {
				if (this.boost < 25) this.health += 1/TICKS_PER_SECOND;
				else if (this.boost < 50) this.health += 3.75/TICKS_PER_SECOND;
				else if (this.boost < 87.5) this.health += 4.75/TICKS_PER_SECOND;
				else this.health += 5/TICKS_PER_SECOND;
				this.health = Math.min(this.health, this.maxHealth);
			}
			this.markDirty();
		}
		// Decrease attack locking timer
		// While attacking, also set moving speed
		if (this.attackLock > 0) {
			this.attackLock--;
			if (this.attackLock <= 0) this.attackLock = 0;
			this.setVelocity();
		}
		// If weapon changed, re-calculate the velocity
		const weapon = this.inventory.getWeapon()!;
		//if weapon == undef then do not reset speed
		if(weapon){
			if (weapon.nameId != this.lastHolding) {
				this.lastHolding = weapon.nameId;
				// Allows sniper switching
				this.attackLock = 0;
				this.maxReloadTicks = this.reloadTicks = 0;
				this.maxHealTicks = this.healTicks = 0;
				this.setVelocity();
			}
		}
		super.tick(entities, obstacles);
		// Terrain particle
		const terrain = world.terrainAtPos(this.position);
		if ([Pond.ID, River.ID, Sea.ID].includes(terrain.id)) {
			if (this.rippleTicks <= 0) {
				world.particles.push(new Particle("ripple", this.position, 0.5));
				this.rippleTicks = 45;
			} else if (this.velocity.magnitudeSqr() != 0) this.rippleTicks--;
		}
		// Check for entity hitbox intersection
		let breaked = false;
		for (const entity of entities) {
			if (!entity.interactable) continue;
			if (entity.hitbox.inside(this.position, entity.position, entity.direction)) {
				this.canInteract = true;
				this.interactMessage = entity.interactionKey();
				// Only interact when trying
				if (this.tryInteracting || this.isMobile) {
					this.canInteract = false;
					entity.interact(this);
				}
				breaked = true;
				break;
			}
		}
		for (const obstacle of obstacles) {
			if (!obstacle.interactable) continue;
			if (obstacle.hitbox.scaleAll(1.25).collideCircle(obstacle.position, obstacle.direction, this.hitbox, this.position, this.direction)) {
				this.canInteract = true;
				this.interactMessage = obstacle.interactionKey();
				// Only interact when trying
				if (this.tryInteracting) {
					this.canInteract = false;
					obstacle.interact(this);
				}
				breaked = true;
				break;
			}
		}
		this.tryInteracting = false;
		if (!breaked) this.canInteract = false;
		// Only attack when trying + not attacking + there's a weapon
		if (this.tryAttacking && this.attackLock <= 0 && weapon) {
			weapon.attack(this, entities, obstacles);
			this.attackLock = weapon.lock;
			this.maxReloadTicks = this.reloadTicks = 0;
			this.maxHealTicks = this.healTicks = 0;
			if (!weapon.auto) this.tryAttacking = false;
			this.markDirty();
		}
		// Building collision handling
		const rooflessAdd = new Set<string>();
		const rooflessDel = new Set<string>();
		for (const building of world.buildings) {
			if (building.zones.some(z => z.hitbox.collideCircle(z.position.addVec(building.position), building.direction, this.hitbox, this.position, this.direction) != CollisionType.NONE)) { rooflessAdd.add(building.id); this.scope = 1; }
			else {
				setTimeout(() => { rooflessDel.add(building.id);  this.scope = this._scope }, 45 ) }
		}
		// Collision handling
		for (const obstacle of obstacles) {
			const collisionType = obstacle.collided(this);
			if (collisionType) {
				obstacle.onCollision(this);
				if (!obstacle.noCollision) {
					if (collisionType == CollisionType.CIRCLE_CIRCLE) this.handleCircleCircleCollision(obstacle);
					else if (collisionType == CollisionType.CIRCLE_RECT_CENTER_INSIDE) this.handleCircleRectCenterCollision(obstacle);
					else if (collisionType == CollisionType.CIRCLE_RECT_POINT_INSIDE) this.handleCircleRectPointCollision(obstacle);
					else if (collisionType == CollisionType.CIRCLE_RECT_LINE_INSIDE) this.handleCircleRectLineCollision(obstacle);
					this.markDirty();
				}
			}
			// For roof to be roofless
			if (obstacle.type === Roof.ID) {
				const roof = <Roof>obstacle;
				if (rooflessAdd.has(roof.buildingId)) roof.addRoofless(this.id)
				if (rooflessDel.has(roof.buildingId) || rooflessAdd.size == 0 ) roof.delRoofless(this.id)
			}
		}

		// Reloading check
		if (this.reloadTicks) {
			if (weapon.type != WeaponType.GUN) this.maxReloadTicks = this.reloadTicks = 0;
			else {
				this.reloadTicks--;
				if (!this.reloadTicks) {
					this.maxReloadTicks = 0;
					const gun = <GunWeapon> weapon;
					var delta = gun.magazine;
					gun.magazine += Math.min(gun.reloadBullets, this.inventory.ammos[gun.color]);
					if (gun.magazine > gun.capacity) gun.magazine = gun.capacity;
					else if (gun.magazine < gun.capacity && gun.reloadBullets != gun.capacity && this.inventory.ammos[gun.color]) this.reload();
					delta -= gun.magazine;
					this.inventory.setWeapon(gun);
					this.inventory.ammos[gun.color] += delta;
					this.pickedAmmo = true;
					this.ammoChanged = gun.color.toString();
					this.numberOfAmmo = this.inventory.ammos[gun.color].toString();
				}
			}
			this.markDirty();
		}

		// Healing check
		if (this.healTicks) {
			this.healTicks--;
			this.setVelocity(); // markDirty
			if (!this.healTicks) {
				this.maxHealTicks = 0;
				const data = Healing.healingData.get(this.healItem!)!;
				this.health = Math.min(this.health + data.heal, this.maxHealth);
				this.boost = Math.min(this.boost + data.boost, this.maxBoost);
				this.inventory.healings[this.healItem!] = this.inventory.healings[this.healItem!] - 1;
				this.healItem = undefined;
			}
		}

		// Check scope difference
		if (this.inventory.selectedScope != this._scope) this._scope = this.inventory.selectedScope;

		// Check red zone
		if (!world.safeZone.hitbox.inside(this.position, world.safeZone.position, Vec2.UNIT_X)) {
			this.zoneDamageTicks--;
			if (!this.zoneDamageTicks) {
				this.zoneDamageTicks = 2 * TICKS_PER_SECOND;
				this.damage(world.zoneDamage);
			}
		}
	}

	damage(dmg: number, damager?: string) {
		if (!this.vulnerable) return;
		// Implement headshot multiplier in gun data later
		if (Math.random() < 0.1) this.health -= dmg * (1 - Helmet.HELMET_REDUCTION[this.inventory.helmetLevel]);
		else this.health -= dmg * (1 - Vest.VEST_REDUCTION[this.inventory.vestLevel]);
		this.potentialKiller = damager;
		this.markDirty();
	}

	die() {
		super.die();
		for (const weapon of this.inventory.weapons) {
			if (weapon?.droppable) {
				if (weapon instanceof GunWeapon) {
					spawnGun(weapon.nameId, weapon.color, this.position, weapon.magazine);
					// spawnAmmo(weapon.magazine, weapon.color, this.position);
				}
			}
		}

		for (let ii = 0; ii < Object.keys(GunColor).length / 2; ii++)
			if (this.inventory.ammos[ii] > 0)
				spawnAmmo(this.inventory.ammos[ii], ii, this.position);

		for (const healing of Object.keys(this.inventory.healings)) {
			if (this.inventory.healings[healing]) {
				const item = new Healing(healing, this.inventory.healings[healing]);
				item.position = this.position;
				world.entities.push(item);
			}
		}
		if (this.inventory.vestLevel) {
			const item = new Vest(this.inventory.vestLevel);
			item.position = this.position;
			world.entities.push(item);
		}
		if (this.inventory.helmetLevel) {
			const item = new Helmet(this.inventory.helmetLevel);
			item.position = this.position;
			world.entities.push(item);
		}
		if (this.inventory.backpackLevel) {
			const item = new Backpack(this.inventory.backpackLevel);
			item.position = this.position;
			world.entities.push(item);
		}
		world.playerDied();
		// Add kill count to killer
		if (this.potentialKiller) {
			const entity = world.entities.find(e => e.id == this.potentialKiller);
			if (entity?.type === this.type) {
				(<Player>entity).killCount++;
				world.killFeeds.push({ killFeed: `${(<Player>entity).username} killed ${this.username} with ${(<Player>entity).lastHolding}`, killer: (<Player>entity).id});
			}
		}
		// Add currency to user if they are logged in and have kills
		if (this.accessToken && this.killCount && !this.currencyChanged) { changeCurrency(this.accessToken, this.killCount * 100); addKillCounts(this.accessToken, this.killCount); this.currencyChanged = true; }

	}

	reload() {
		this.waitingForReload = true;
		if (this.maxReloadTicks) { console.log("yo wth man");  return; } 
		const weapon = this.inventory.getWeapon();
		if (weapon?.type != WeaponType.GUN) return;
		const gun = <GunWeapon>weapon;
		world.onceSounds.push({ path: `guns/${gun.nameId}_reload.mp3`, position: this.position })
		if (!this.inventory.ammos[gun.color] || gun.magazine == gun.capacity) { this.waitingForReload = true; return; } 
		this.maxReloadTicks = this.reloadTicks = gun.reloadTicks;
		this.markDirty();
		this.waitingForReload = false;
	}

	heal(item: string) {
		if (this.maxHealTicks) return;
		if (!this.inventory.healings[item]) return;
		if (this.health >= this.maxHealth && !Healing.healingData.get(item)?.boost) return;
		world.onceSounds.push({ path: `items/${item}.mp3`, position: this.position })
		this.maxHealTicks = this.healTicks = Healing.healingData.get(item)!.time * TICKS_PER_SECOND / 1000;
		this.currentHealItem = `entity.healing.${item}`;
		this.healItem = item;
		this.markDirty();
	}

	minimize() {
		const min = super.minimize();
		return Object.assign(min, { username: this.username, inventory: this.inventory.minimize(), skin: this.skin, deathImg: this.deathImg })
	}
}