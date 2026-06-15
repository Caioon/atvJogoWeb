// public/js/game/socketClient.js

export const remotePlayers = {};
const targetPositions = {};

const LERP_FACTOR = 0.2;
const SNAP_DISTANCE = 200;

let ws = null;

// Mapa name -> cor, populado ao entrar no jogo
export const playerColors = {};

export async function loadColors() {

    try {
        const res = await fetch('/api/game/colors');
        const data = await res.json();
        Object.assign(playerColors, data);
    } catch (err) {
        console.error('Erro ao carregar cores:', err);
    }
}

export function initializeSocket(playerName, onReady) {

    const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
    ws = new WebSocket(`${protocol}://${location.host}`);

    ws.addEventListener('open', () => {
        // Identifica o jogador logo após conectar
        ws.send(JSON.stringify({ type: 'identify', name: playerName }));
        onReady && onReady();
    });

    ws.addEventListener('message', (event) => {

        let msg;

        try {
            msg = JSON.parse(event.data);
        } catch {
            return;
        }

        if (msg.type !== 'players') return;

        const data = msg.data;

        for (const [name, pos] of Object.entries(data)) {

            if (name === playerName) continue;

            targetPositions[name] = { x: pos.x, y: pos.y };

            if (!remotePlayers[name]) {
                remotePlayers[name] = { x: pos.x, y: pos.y };
            }
        }

        for (const name of Object.keys(remotePlayers)) {
            if (!data[name]) {
                delete remotePlayers[name];
                delete targetPositions[name];
            }
        }
    });
}

export function updateRemotePlayers() {

    for (const name of Object.keys(targetPositions)) {

        const target  = targetPositions[name];
        const current = remotePlayers[name];

        if (!current) continue;

        const dx = target.x - current.x;
        const dy = target.y - current.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > SNAP_DISTANCE) {
            current.x = target.x;
            current.y = target.y;
        } else {
            current.x += dx * LERP_FACTOR;
            current.y += dy * LERP_FACTOR;
        }
    }
}

export function sendPosition(x, y) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'position', x, y }));
    }
}
