const COLORS = [
    '#7c6af7', // roxo  (admin)
    '#f76a6a', // vermelho
    '#6af7a0', // verde
    '#f7d46a', // amarelo
    '#6ab8f7', // azul
    '#f76aec', // rosa
    '#f7a06a', // laranja
    '#6af7f0', // ciano
];

const gameState = {
    status: 'waiting',
    countingDown: false,
    countdownValue: 10,
    countdownTimer: null,
    playersInLobby: [],
    playersInMatch: [],
    map: [],
    colors: COLORS
};

module.exports = gameState;
