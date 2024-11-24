/* eslint-disable @typescript-eslint/no-unused-vars */
import "dotenv/config";
import { readFileSync } from "fs";
import * as ws from "ws";
import { ID, receive, send, wait } from "./utils";
import { MousePressPacket, MouseReleasePacket, MouseMovePacket, MovementPressPacket, MovementReleasePacket, GamePacket, ParticlesPacket, MapPacket, AckPacket, SwitchWeaponPacket, SoundPacket, UseHealingPacket, ResponsePacket, MobileMovementPacket, AnnouncePacket, PlayerRotationDelta, IPacket, ScopeUpdatePacket, ServerSideScopeUpdate, AmmoUpdatePacket } from "./types/packet";
import { DIRECTION_VEC, TICKS_PER_SECOND } from "./constants";
import { CommonAngles, Vec2 } from "./types/math";
import { Player } from "./store/entities";
import { World } from "./types/world";
import { Plain, castMapTerrain } from "./store/terrains";
import { castMapObstacle } from "./store/obstacles";
import { castBuilding } from "./store/buildings";
import { MapData } from "./types/data";

export var ticksElapsed = 0;

const server = new ws.Server({ port: 8080 });
server.once("listening", () => console.log(`WebSocket Server listening at port ${server.options.port}`));

export const sockets = new Map<string, ws.WebSocket>();

// Initialize the map
export var world: World;
export function reset(map = "regular") {
	for (const socket of sockets.values()) socket.close();
	sockets.clear();
	
	const mapData = <MapData>JSON.parse(readFileSync(`../data/maps/${map}.json`, { encoding: "utf8" }));

	world = new World(Vec2.fromArray(mapData.size), castMapTerrain({ id: mapData.defaultTerrain }) || new Plain());
	// Add terrains
	let ii: number;
	for (const data of mapData.terrains) {
		for (ii = 0; ii < (data.amount || 1); ii++) {
			const terrain = castMapTerrain(data);
			if (!terrain) continue;
			world.terrains.push(terrain);
		}
	}
	
	// Add buildings
	for (const data of mapData.buildings) {
		for (ii = 0; ii < (data.amount || 1); ii++) {
			const building = castBuilding(data.id);
			if (!building) continue;
			let position = world.size.scale(Math.random(), Math.random());
			if (data.position) position = Vec2.fromArray(data.position);
			else if (data.includeTerrains)
				while (!data.includeTerrains.includes(world.terrainAtPos(position).id))
					position = world.size.scale(Math.random(), Math.random());
			building.setPosition(position);
			if (data.direction) building.setDirection(Vec2.fromArray(data.direction));
			else building.setDirection(Vec2.UNIT_X.addAngle(Math.floor(Math.random() * 4) * CommonAngles.PI_TWO));
			world.buildings.push(building);
		}
	}
	
	// Add obstacles
	for (const data of mapData.obstacles) {
		for (ii = 0; ii < (data.amount || 1); ii++) {
			const obstacle = castMapObstacle(data);
			if (!obstacle) continue;
			world.obstacles.push(obstacle);
		}
	}
}
reset();

server.on("connection", async socket => {
	console.log("Received a connection request");
	// Set the type for msgpack later.
	socket.binaryType = "arraybuffer";

	// Add socket to map with a generated ID.
	const id = ID();
	sockets.set(id, socket);

	// Setup the close connection listener. Socket will be deleted from map.
	var connected = false;
	socket.on("close", () => {
		try { player.die(); }
		catch (err) {console.log("hi") }		
		console.log("Connection closed");
		sockets.delete(id);
		connected = false;
	});

	var username = "";
	var accessToken: string | undefined = undefined;
	var skin = "default";
	var deathImg = "default";
	var isMobile = false;
	// Communicate with the client by sending the ID and map size. The client should respond with ID and username, or else close the connection.
	await Promise.race([wait(10000), new Promise<void>(resolve => {
		send(socket, new AckPacket(id, TICKS_PER_SECOND, world.size, world.defaultTerrain));
		socket.once("message", (msg: ArrayBuffer) => {
			const decoded = <ResponsePacket>receive(msg);
			if (decoded.id == id && decoded.username && decoded.skin && decoded.deathImg) {
				connected = true;
				username = decoded.username;
				accessToken = decoded.accessToken;
				skin = decoded.skin;
				deathImg = decoded.deathImg;
				isMobile = decoded.isMobile;
			} else try { socket.close(); } catch (err) { }
			resolve();
		})
	})]);
	if (!connected) return;
	console.log(`A new player with ID ${id} connected!`);

	// Create the new player and add it to the entity list.
	const player = new Player(id, username, skin, deathImg, accessToken, isMobile);
	world.addPlayer(player);
	// Send the player the entire map
	send(socket, new MapPacket(world.obstacles, world.buildings, world.terrains.concat(...world.buildings.map(b => b.floors.map(fl => fl.terrain)))));
	// Send the player initial objects
	send(socket, new GamePacket(world.entities, world.obstacles.concat(...world.buildings.map(b => b.obstacles.map(o => o.obstacle))), player, world.playerCount, true));
	// Send the player music
	for (const sound of world.joinSounds) send(socket, new SoundPacket(sound.path, sound.position));
	// If the client doesn't ping for 30 seconds, we assume it is a disconnection.
	const timeout = setTimeout(() => {
		try {socket.close(); } catch (err) { }
	}, 30000);

	// The 4 directions of movement
	const movements = [false, false, false, false];
	const buttons = new Map<number, boolean>();

	socket.on("message", (msg: ArrayBuffer) => {
		const decoded = receive(msg);
		switch (decoded.type) {
			case "ping":
				timeout.refresh();
				break;
			case "movementReset":
				player.setVelocity(Vec2.ZERO)
				break;
			case "playerRotation":
				const RotationPacket = <PlayerRotationDelta>decoded;
				player.setDirection(new Vec2(Math.cos(RotationPacket.angle) * 1.45, Math.sin(RotationPacket.angle) * 1.45))
				break;
			case "mobilemovement":
				const MMvPacket = <MobileMovementPacket>decoded
				player.setVelocity(new Vec2(Math.cos(MMvPacket.direction) * 1.45, Math.sin(MMvPacket.direction) * 1.45))
				break;
			case "movementpress":
				// Make the direction true
				const mvPPacket = <MovementPressPacket>decoded;
				movements[mvPPacket.direction] = true;
				// Add corresponding direction vector to a zero vector to determine the velocity and direction.
				var angleVec = Vec2.ZERO;
				for (let ii = 0; ii < movements.length; ii++) if (movements[ii]) angleVec = angleVec.addVec(DIRECTION_VEC[ii]);
				player.setVelocity(angleVec.unit());
				break;
			case "movementrelease":
				// Make the direction false
				const mvRPacket = <MovementReleasePacket>decoded;
				movements[mvRPacket.direction] = false;
				// Same as movementpress
				var angleVec = Vec2.ZERO;
				for (let ii = 0; ii < movements.length; ii++) if (movements[ii]) angleVec = angleVec.addVec(DIRECTION_VEC[ii]);
				player.setVelocity(angleVec.unit());
				break;
			// Very not-done. Will probably change to "attack" and "use" tracking.
			case "mousepress":
				buttons.set((<MousePressPacket>decoded).button, true);
				if (buttons.get(0)) player.tryAttacking = true;
				break;
			case "mouserelease":
				buttons.set((<MouseReleasePacket>decoded).button, false);
				if (!buttons.get(0)) player.tryAttacking = false;
				break;
			case "mousemove":
				const mMvPacket = <MouseMovePacket>decoded;
				// { x, y } will be x and y offset of the client from the centre of the screen.
				player.setDirection(new Vec2(mMvPacket.x, mMvPacket.y));
				break;
			case "interact":
				player.tryInteracting = true;
				break;
			case "switchweapon":
				const swPacket = <SwitchWeaponPacket>decoded;
				if (swPacket.setMode) {
					if (player.inventory.getWeapon(swPacket.delta))
						player.inventory.holding = swPacket.delta;
				} else {
					const unitDelta = swPacket.delta < 0 ? -1 : 1;
					var holding = player.inventory.holding + swPacket.delta;
					if (holding < 0) holding += player.inventory.weapons.length;
					else holding %= player.inventory.weapons.length;
					while (!player.inventory.getWeapon(holding)) {
						holding += unitDelta;
						if (holding < 0) holding += player.inventory.weapons.length;
						else holding %= player.inventory.weapons.length;
					}
					player.inventory.holding = holding;
				}
				break;
			case "reloadweapon":
				player.reload();
				break;
			case "usehealing":
				player.heal((<UseHealingPacket>decoded).item);
				break;
			case "serverSideScopeUpdate":
				const data = (<ServerSideScopeUpdate>decoded)
				player.inventory.selectScope(Number(data.scope))
				break;
			case "cancelActionsPacket":
				player.healTicks = 0;
				player.reloadTicks = 0;
		}
	});
});

setInterval(() => {
	world.tick();
	// Filter players from entities and send them packets
	const players = <Player[]>world.entities.filter(entity => entity.type === "player");
	players.forEach(player => {
		const socket = sockets.get(player.id);
		if (!socket) return;
		const pkt = new GamePacket(world.dirtyEntities, world.dirtyObstacles, player, world.playerCount, false, world.discardEntities, world.discardObstacles)
		if (world.zoneMoving) pkt.addSafeZoneData(world.safeZone);
		else pkt.addNextSafeZoneData(world.nextSafeZone);
		send(socket, pkt);
		if (world.particles.length) send(socket, new ParticlesPacket(world.particles, player));
		for (const sound of world.onceSounds) send(socket, new SoundPacket(sound.path, sound.position));
		for (const killFeed of world.killFeeds) send(socket, new AnnouncePacket(killFeed.killFeed, killFeed.killer))
		if (player.changedScope) {
			send(socket, new ScopeUpdatePacket(player.lastPickedUpScope)); player.changedScope = false;
		}
		if (player.pickedAmmo) {
			send(socket, new AmmoUpdatePacket(player.ammoChanged, player.numberOfAmmo));
			player.pickedAmmo = false;
		}
	});
	world.postTick();
}, 1000 / TICKS_PER_SECOND);
