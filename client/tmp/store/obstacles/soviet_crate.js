"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _1 = require(".");
const obstacle_1 = require("../../types/obstacle");
const crateImg = Object.assign(new Image(), { loaded: false });
crateImg.onload = () => crateImg.loaded = true;
crateImg.src = "assets/images/game/objects/soviet_crate.png";
const crateResidueImg = Object.assign(new Image(), { loaded: false });
crateResidueImg.onload = () => crateResidueImg.loaded = true;
crateResidueImg.src = "assets/images/game/objects/residues/crate.svg";
class SovietCrateSupplier {
    create(minObstacle) {
        return new SovietCrate(minObstacle);
    }
}
class SovietCrate extends obstacle_1.Obstacle {
    constructor() {
        super(...arguments);
        this.type = SovietCrate.TYPE;
    }
    render(you, canvas, ctx, scale) {
        if (!crateImg.loaded || !crateResidueImg.loaded)
            return;
        const relative = this.position.addVec(you.position.inverse());
        const width = scale * this.hitbox.width * (this.despawn ? 0.5 : 1), height = width * crateImg.naturalWidth / crateImg.naturalHeight;
        ctx.translate(canvas.width / 2 + relative.x * scale, canvas.height / 2 + relative.y * scale);
        ctx.rotate(-this.direction.angle());
        ctx.drawImage(this.despawn ? crateResidueImg : crateImg, -width / 2, -height / 2, width, height);
        ctx.resetTransform();
    }
    renderMap(_canvas, ctx, scale) {
        ctx.translate(this.position.x * scale, this.position.y * scale);
        ctx.fillStyle = "#683c05";
        ctx.fillRect(-2 * scale, -2 * scale, 4 * scale, 4 * scale);
        ctx.resetTransform();
    }
}
exports.default = SovietCrate;
SovietCrate.TYPE = "soviet_crate";
(() => {
    _1.OBSTACLE_SUPPLIERS.set(SovietCrate.TYPE, new SovietCrateSupplier());
})();
//# sourceMappingURL=soviet_crate.js.map