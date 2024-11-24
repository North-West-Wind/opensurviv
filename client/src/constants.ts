/**
 * What keys for what actions
 * @todo make this configurable
 */
export enum KeyBind {
	MENU = "Escape",
	HIDE_HUD = "F1",
	WORLD_MAP = "g",
	HIDE_MAP = "z",
	BIG_MAP = "v",
	RIGHT = "d",
	UP = "w",
	LEFT = "a",
	DOWN = "s",
	INTERACT = "f",
	MELEE = "e",
	LAST_USED = "q",
	RELOAD = "r",
	CANCEL = "x"
}

// Keys for right, up, left, down (ordered)
export const movementKeys = [KeyBind.RIGHT, KeyBind.UP, KeyBind.LEFT, KeyBind.DOWN].map(k => <string> k);
// In-game units interval between the grid lines
export const GRID_INTERVAL = 20;
// In-game units of the map to be shown with the minimap
export const MINIMAP_SIZE = 100;
// Timeout in milliseconds before cancelling connection
export const TIMEOUT = 10000;
// Translate original surviv.io game units to suit this one
export const GLOBAL_UNIT_MULTIPLIER = 0.5;
// For now we will assume the user uses English
export const LANG = "en_us";
// Gun color index
export enum GunColor {
	YELLOW = 0, // 9mm
	RED = 1, // 12 gauge
	BLUE = 2, // 7.62mm
	GREEN = 3, // 5.56mm
	BLACK = 4, // .50 AE
	OLIVE = 5, // .308 Subsonic
	ORANGE = 6, // Flare
	PURPLE = 7, // .45 ACP
	TEAL = 8, // 40mm
	BROWN = 9, // potato
	PINK = 10, // Heart
	PURE_BLACK = 11, // Rainbow
	CURSED = 12,
	BUGLE = 13,
}