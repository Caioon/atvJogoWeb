const express = require('express');
const path = require('path');
const gameState = require('../server/gameState');
const { generateMap, MAP_HEIGHT } = require('../server/mapGen');

const router = express.Router();

function requirePlayer(req, res, next) {

  if (!req.session.playerName) {
    return res.redirect('/');
  }

  next();
}

function requireGameAccess(req, res, next) {

  if (!req.session.playerName) {
    return res.redirect('/');
  }

  if (gameState.status !== 'playing') {
    return res.redirect('/lobby');
  }

  if (!gameState.playersInMatch.some(p => p.name === req.session.playerName)) {
    return res.redirect('/waiting');
  }

  next();
}

// --- Rotas de página ---

router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/index.html'));
});

router.get('/lobby', requirePlayer, (req, res) => {

  // Se partida em andamento, manda pra waiting
  if (gameState.status === 'playing') {
    return res.redirect('/waiting');
  }

  res.sendFile(path.join(__dirname, '../views/lobby.html'));
});

router.get('/waiting', requirePlayer, (req, res) => {

  // Se não há partida em andamento, volta pro lobby
  if (gameState.status !== 'playing') {
    return res.redirect('/lobby');
  }

  res.sendFile(path.join(__dirname, '../views/waiting.html'));
});

router.get('/game', requireGameAccess, (req, res) => {
  res.sendFile(path.join(__dirname, '../views/game.html'));
});

// --- API de nome ---

router.post('/api/register-name', (req, res) => {

  const { name } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ success: false });
  }

  req.session.playerName = name.trim();

  res.json({ success: true });
});

// --- API de lobby ---

router.post('/api/lobby/join', requirePlayer, (req, res) => {

  const name = req.session.playerName;

  const alreadyIn = gameState.playersInLobby.some(p => p.name === name);

  if (!alreadyIn) {
    const colorIndex = gameState.playersInLobby.length % gameState.colors.length;
    const color = gameState.colors[colorIndex];
    gameState.playersInLobby.push({ name, color });
  }

  res.json({ ok: true });
});

router.get('/api/lobby/state', requirePlayer, (req, res) => {

  const name = req.session.playerName;

  const inMatch = gameState.status === 'playing' &&
    gameState.playersInMatch.some(p => p.name === name);

  res.json({
    status: gameState.status,
    countingDown: gameState.countingDown,
    countdownValue: gameState.countdownValue,
    players: gameState.playersInLobby,
    inMatch
  });
});

// --- API de countdown ---

router.post('/api/lobby/countdown/start', requirePlayer, (req, res) => {

  const name = req.session.playerName;

  if (
    gameState.playersInLobby.length === 0 ||
    gameState.playersInLobby[0].name !== name
  ) {
    return res.status(403).json({ ok: false, reason: 'not_admin' });
  }

  if (gameState.countingDown) {
    return res.json({ ok: true });
  }

  gameState.countingDown = true;
  gameState.countdownValue = 10;

  gameState.countdownTimer = setInterval(() => {

    gameState.countdownValue--;

    if (gameState.countdownValue <= 0) {

      clearInterval(gameState.countdownTimer);
      gameState.countdownTimer = null;

      gameState.status = 'playing';
      gameState.countingDown = false;
      gameState.playersInMatch = [...gameState.playersInLobby];
      const generated = generateMap();
      gameState.map = generated.platforms;
      gameState.goal = generated.goal;
    }

  }, 1000);

  res.json({ ok: true });
});

router.post('/api/lobby/countdown/cancel', requirePlayer, (req, res) => {

  const name = req.session.playerName;

  if (
    gameState.playersInLobby.length === 0 ||
    gameState.playersInLobby[0].name !== name
  ) {
    return res.status(403).json({ ok: false, reason: 'not_admin' });
  }

  if (gameState.countdownTimer) {
    clearInterval(gameState.countdownTimer);
    gameState.countdownTimer = null;
  }

  gameState.countingDown = false;
  gameState.countdownValue = 10;

  res.json({ ok: true });
});

// --- API de jogo ---

router.post('/api/game/win', requirePlayer, (req, res) => {

  const name = req.session.playerName;

  // Só válido se ainda está em partida
  if (!gameState.playersInMatch.some(p => p.name === name)) {
    return res.status(400).json({ ok: false });
  }

  gameState.lastWinner = name;
  gameState.status = 'waiting';
  gameState.countingDown = false;
  gameState.countdownValue = 10;
  gameState.playersInLobby = [];
  gameState.playersInMatch = [];

  res.json({ ok: true });
});

router.post('/api/game/leave', requirePlayer, (req, res) => {

  const name = req.session.playerName;

  gameState.playersInMatch =
    gameState.playersInMatch.filter(p => p.name !== name);

  // Penúltimo saiu (sobrou 1): declara vencedor e encerra
  if (gameState.playersInMatch.length === 1) {

    gameState.lastWinner = gameState.playersInMatch[0].name;
    gameState.status = 'waiting';
    gameState.countingDown = false;
    gameState.countdownValue = 10;
    gameState.playersInLobby = [];
  }

  // Último saiu: só limpa
  if (gameState.playersInMatch.length === 0) {

    gameState.lastWinner = null;
    gameState.status = 'waiting';
    gameState.countingDown = false;
    gameState.countdownValue = 10;
    gameState.playersInLobby = [];
  }

  res.json({ ok: true });
});

router.post('/api/game/end', (req, res) => {

  if (gameState.countdownTimer) {
    clearInterval(gameState.countdownTimer);
    gameState.countdownTimer = null;
  }

  gameState.status = 'waiting';
  gameState.countingDown = false;
  gameState.countdownValue = 10;
  gameState.playersInLobby = [];
  gameState.playersInMatch = [];
  gameState.map = [];
  gameState.goal = null;
  gameState.lastWinner = null;

  res.json({ ok: true });
});

router.get('/api/game/state', (req, res) => {

  res.json({
    status: gameState.status,
    playersInMatch: gameState.playersInMatch,
    lastWinner: gameState.lastWinner || null
  });
});

router.get('/api/game/map', requirePlayer, (req, res) => {

  res.json({
    platforms: gameState.map,
    goal: gameState.goal,
    mapHeight: MAP_HEIGHT
  });
});

router.get('/api/game/colors', requirePlayer, (req, res) => {

  const colorMap = {};

  for (const p of gameState.playersInMatch) {
    colorMap[p.name] = p.color;
  }

  res.json(colorMap);
});

module.exports = router;
