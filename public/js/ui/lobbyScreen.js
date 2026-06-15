import { appState } from '../state.js';

export async function initializeLobby() {

  appState.playerName =
    sessionStorage.getItem('playerName') || 'Jogador';

  await fetch('/api/lobby/join', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });

  const res = await fetch('/api/lobby/state');
  const state = await res.json();

  appState.players = state.players || [];

  renderLobby();
  updateUI(state);

  appState.pollTimer = setInterval(async () => {

    const res = await fetch('/api/lobby/state');
    const data = await res.json();

    if (data.status === 'playing') {
      clearInterval(appState.pollTimer);
      window.location.href = data.inMatch ? '/game' : '/waiting';
      return;
    }

    appState.players = data.players || [];
    renderLobby();
    updateUI(data);

  }, 1000);

  document
    .getElementById('btn-start')
    .addEventListener('click', startCountdown);

  document
    .getElementById('btn-cancel')
    .addEventListener('click', cancelCountdown);
}

function isAdmin() {
  return appState.players.length > 0 &&
    appState.players[0].name === appState.playerName;
}

function updateUI(data) {

  const adminArea   = document.getElementById('admin-area');
  const waitingArea = document.getElementById('waiting-area');
  const btnStart    = document.getElementById('btn-start');
  const btnCancel   = document.getElementById('btn-cancel');

  const countdownArea        = document.getElementById('countdown-area');
  const countdownNumber      = document.getElementById('countdown-number');
  const countdownAreaGuest   = document.getElementById('countdown-area-guest');
  const countdownNumberGuest = document.getElementById('countdown-number-guest');
  const waitingText          = document.getElementById('waiting-text');

  const lobbyCount = document.getElementById('lobby-count');
  if (lobbyCount) {
    const n = data.players?.length || 0;
    lobbyCount.textContent = `${n} jogador${n !== 1 ? 'es' : ''} conectado${n !== 1 ? 's' : ''}`;
  }

  if (isAdmin()) {

    adminArea.style.display   = '';
    waitingArea.style.display = 'none';

    if (data.countingDown) {
      countdownArea.classList.add('visible');
      countdownNumber.textContent = data.countdownValue;
      btnStart.style.display  = 'none';
      btnCancel.style.display = '';
    } else {
      countdownArea.classList.remove('visible');
      btnStart.style.display  = '';
      btnCancel.style.display = 'none';
    }

  } else {

    adminArea.style.display   = 'none';
    waitingArea.style.display = '';

    if (data.countingDown) {
      waitingText.style.display = 'none';
      countdownAreaGuest.classList.add('visible');
      countdownNumberGuest.textContent = data.countdownValue;
    } else {
      waitingText.style.display = '';
      countdownAreaGuest.classList.remove('visible');
    }
  }
}

function renderLobby() {

  const playerList = document.getElementById('player-list');

  playerList.innerHTML = '';

  appState.players.forEach((player, index) => {

    const div = document.createElement('div');

    div.className = 'player-item';

    div.innerHTML = `
      <span class="player-dot"></span>
      <span class="player-name">${player.name}</span>
      ${index === 0 ? '<span class="player-tag">adm</span>' : ''}
    `;

    playerList.appendChild(div);
  });
}

async function startCountdown() {

  if (!isAdmin()) return;

  await fetch('/api/lobby/countdown/start', { method: 'POST' });
}

async function cancelCountdown() {

  if (!isAdmin()) return;

  await fetch('/api/lobby/countdown/cancel', { method: 'POST' });
}
