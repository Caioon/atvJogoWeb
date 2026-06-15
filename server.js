const express = require('express');
const path = require('path');
const session = require('express-session');
const { createServer } = require('http');
const { WebSocketServer } = require('ws');

const pageRoutes = require('./routes/pages');

const app = express();
const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer });

const hostname = '0.0.0.0';
const port = 3000;

app.use(express.json());

const sessionMiddleware = session({
    secret: 'ascend-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 60 * 4
    }
});

app.use(sessionMiddleware);
app.use(express.static(path.join(__dirname, 'public')));
app.use('/', pageRoutes);

// Mapa de posições: name -> { x, y }
const playerPositions = {};

wss.on('connection', (ws) => {

    let playerName = null;

    // Envia posições de todos a cada frame (~60fps)
    const interval = setInterval(() => {
        if (ws.readyState === ws.OPEN) {
            ws.send(JSON.stringify({ type: 'players', data: playerPositions }));
        }
    }, 16);

    ws.on('message', (raw) => {

        let msg;

        try {
            msg = JSON.parse(raw);
        } catch {
            return;
        }

        // Primeira mensagem: identificação do jogador
        if (msg.type === 'identify') {
            playerName = msg.name;
            playerPositions[playerName] = { x: 0, y: 0 };
            return;
        }

        // Atualização de posição
        if (msg.type === 'position' && playerName) {
            playerPositions[playerName] = { x: msg.x, y: msg.y };
        }
    });

    ws.on('close', () => {
        if (playerName) {
            delete playerPositions[playerName];
        }
        clearInterval(interval);
    });
});

httpServer.listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}/`);
});
