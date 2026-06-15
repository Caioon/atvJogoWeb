// server/mapGen.js

const MAP_HEIGHT     = 6000;
const PLATFORM_COUNT = 42;
const MIN_W          = 80;
const MAX_W          = 220;
const MIN_GAP_Y      = 110;
const MAX_GAP_Y      = 140;
const CANVAS_W       = 600;
const SPAWN_W        = 300;

const POLE_W    = 6;
const POLE_H    = 80;
const FLAG_W    = 36;
const FLAG_H    = 22;

function rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateMap() {

    const platforms = [];

    platforms.push({
        x: CANVAS_W / 2 - SPAWN_W / 2,
        y: MAP_HEIGHT - 60,
        w: SPAWN_W,
        h: 14
    });

    let lastX = CANVAS_W / 2 - SPAWN_W / 2;
    let lastW = SPAWN_W;
    let lastY = MAP_HEIGHT - 60;

    for (let i = 1; i < PLATFORM_COUNT; i++) {

        const w     = rand(MIN_W, MAX_W);
        const gapY  = rand(MIN_GAP_Y, MAX_GAP_Y);
        const y     = lastY - gapY;

        const lastCenter = lastX + lastW / 2;
        const maxReach   = 180;
        const minX = Math.max(10, lastCenter - maxReach - w / 2);
        const maxX = Math.min(CANVAS_W - w - 10, lastCenter + maxReach - w / 2);
        const x    = rand(minX, maxX);

        platforms.push({ x, y, w, h: 12 });

        lastX = x;
        lastW = w;
        lastY = y;
    }

    // Goal: centro da última plataforma (topo do mapa)
    const topPlatform = platforms[platforms.length - 1];
    const poleX = topPlatform.x + topPlatform.w / 2 - POLE_W / 2;
    const poleY = topPlatform.y - POLE_H;

    const goal = {
        poleX,
        poleY,
        poleW: POLE_W,
        poleH: POLE_H,
        flagX: poleX + POLE_W,
        flagY: poleY,
        flagW: FLAG_W,
        flagH: FLAG_H
    };

    return { platforms, goal };
}

module.exports = { generateMap, MAP_HEIGHT };
