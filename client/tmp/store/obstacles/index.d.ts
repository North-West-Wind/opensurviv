import { MinObstacle, MinMinObstacle } from "../../types/minimized";
import { ObstacleSupplier } from "../../types/supplier";
export declare const OBSTACLE_SUPPLIERS: Map<string, ObstacleSupplier>;
export { default as Tree } from "./tree";
export { default as Bush } from "./bush";
export { default as Crate } from "./crate";
export { default as MosinTree } from "./mosin_tree";
export { default as Stone } from "./stone";
export { default as SovietCrate } from "./soviet_crate";
export { default as GrenadeCrate } from "./grenade_crate";
export { default as AWMCrate } from "./awm_crate";
export { default as Barrel } from "./barrel";
export { default as AK47Stone } from "./ak47stone";
export declare function castCorrectObstacle(minObstacle: MinObstacle & any): import("../../types/obstacle").Obstacle;
export declare function castMinObstacle(minMinObstacle: MinMinObstacle & any): any;