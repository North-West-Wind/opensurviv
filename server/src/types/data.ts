import { GunColor } from "./misc"

export interface BulletStats {
	damage: number
	objDamage?: number
	falloff: number
	speed: number
	range: number[]
	suppressed: boolean
	noClip?: boolean
}

interface GunStats {
	capacity: number
	reload: {
		bullets?: number
		time: number
	}
	delay: {
		switch: number
		firing: number
		burst?: number
	}
	spread: {
		still: number
		move: number
	}
	bullets: number
	bursts?: number
	speed: {
		equip: number
		attack: number
	}
	headshot: number
	recoil?: number
	bullet: BulletStats
}

export interface TracerData {
	type: string
	width: number
	length: number
}

export type GunData = {
	[key: string]: Partial<GunStats>
} & {
	color: GunColor
	ammo: number
	dual: boolean
	auto?: boolean
	length: number
	droppable: boolean
	normal: GunStats
	visuals: {
		tracer: TracerData
		animations: string[]
		hasBarrelImage: boolean
		particleToDisplay: string
	},
	fistPositions?: Array<number>
}

interface MeleeStats {
	noArmor?: boolean
	noStone?: boolean
	cleave?: boolean
	damage: number
	multiplier: {
		headshot: number
		obstacle: number
	},
	damageDelay: number
	cooldown: number
	offset: {
		x: number
		y: number
	},
	radius: number
	speed: {
		equip: number
		attack: number
	}
}

export type MeleeData = {
	[key: string]: Partial<MeleeStats>
} & {
	reflective?: boolean
	auto?: boolean
	droppable: boolean
	normal: MeleeStats
	sounds: {
		swing: string
	}
	visuals: {
		animations: string[]
	}
}

export interface TracerColor {
	color: {
		regular: string;
		saturated: string;
		chambered: string;
	}
}

export type TracerColorData = {
	[key: string]: TracerColor;
}

interface TypeLootTableEntry {
	rarity: number;
	weight: number;
	amount?: number;
}

export type TypeLootTableData = {
	[key: string]: TypeLootTableEntry;
}

export type LootTableData = {
	rolls: number;
	rarity: number;
	entries: string[];
}

export type HealingData = {
	heal: number;
	boost: number;
	time: number;
}

export type ObstacleData = {
	type: string;
	direction?: number[] | number;
	position: number[];
	special?: string;
	[key: string]: any;
}

export type TerrainData = {
	type: string;
	position: number[];
	[key: string]: any;
}

export type BuildingData = {
	obstacles: ObstacleData[];
	zones?: { position: number[], hitbox: number[] | number, map?: boolean }[];
	floors?: TerrainData[];
	roofs?: ObstacleData[];
	mapColor?: number;
	subBuildings?: {
		id: string,
		position: number[],
		direction: number[]
	}
}

export type RedZoneDataEntry = {
	wait: number;
	move: number;
	damage: number;
	area: number;
}

export type TextureData = {
	path: string;
	horizontalFill?: number;
}

export type MapTerrainData = {
	id: string;
	position?: number[];
	direction?: number[];
	amount?: number;
	args?: any[];
}

export type MapBuildingData = {
	id: string;
	position?: number[];
	direction?: number[];
	amount?: number;
	includeTerrains?: string[];
	subBuildings?: {
		id: string,
		position: number[],
		direction: number[]
	}
}

export type MapObstacleData = {
	type: string;
	position?: number[];
	direction?: number[];
	amount?: number;
	args?: any[];
}

export type MapData = {
	size: number[];
	defaultTerrain: string;
	terrains: MapTerrainData[];
	buildings: MapBuildingData[];
	obstacles: MapObstacleData[];
}