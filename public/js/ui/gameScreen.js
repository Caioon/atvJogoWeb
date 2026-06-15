import { Game } from '../game/game.js';
import { initializeSocket, loadColors } from '../game/socketClient.js';
import { initializeMobileControls } from '../game/input.js';
import { appState } from '../state.js';

let game        = null;
let lossPoll    = null;

export async function initializeGameScreen() {

    const canvas         = document.getElementById('game-canvas');
    const overlayDeath   = document.getElementById('overlay-death');
    const overlayVictory = document.getElementById('overlay-victory');
    const overlayLoss    = document.getElementById('overlay-loss');
    const lossWinner     = document.getElementById('loss-winner');

    appState.playerName =
        sessionStorage.getItem('playerName') || '';

    const hudName = document.getElementById('hud-name');
    if (hudName) hudName.textContent = appState.playerName;

    await loadColors();

    const mapRes = await fetch('/api/game/map');
    const { platforms, goal, mapHeight } = await mapRes.json();

    initializeMobileControls();

    game = new Game(canvas, platforms, goal, mapHeight);

    // Polling para detectar que outro player venceu (ou todos morreram)
    function startLossPoll() {
        lossPoll = setInterval(async () => {
            try {
                const res  = await fetch('/api/game/state');
                const data = await res.json();

                if (data.status !== 'playing' && data.lastWinner) {
                    clearInterval(lossPoll);

                    if (data.lastWinner === appState.playerName) {
                        game.stop();
                        overlayVictory.style.display = 'flex';
                    } else {
                        lossWinner.textContent = data.lastWinner;
                        overlayLoss.style.display = 'flex';
                    }
                }
            } catch (err) {
                console.error(err);
            }
        }, 1000);
    }

    // Morte: caiu no vazio
    game.onDeath = async () => {
        clearInterval(lossPoll);
        await fetch('/api/game/leave', { method: 'POST' });
        overlayDeath.style.display = 'flex';
    };

    // Vitória: tocou na bandeira
    game.onWin = async () => {
        clearInterval(lossPoll);
        await fetch('/api/game/win', { method: 'POST' });
        overlayVictory.style.display = 'flex';
    };

    initializeSocket(appState.playerName, () => {
        game.start();
        startLossPoll();
    });

    window.addEventListener('resize', () => game.resize());

    document
        .getElementById('btn-back-lobby')
        .addEventListener('click', async () => {
            clearInterval(lossPoll);
            game.stop();
            await fetch('/api/game/leave', { method: 'POST' });
            window.location.href = '/lobby';
        });

    document
        .getElementById('btn-death-lobby')
        .addEventListener('click', () => {
            window.location.href = '/waiting';
        });

    document
        .getElementById('btn-victory-lobby')
        .addEventListener('click', () => {
            window.location.href = '/lobby';
        });

    document
        .getElementById('btn-loss-lobby')
        .addEventListener('click', () => {
            window.location.href = '/waiting';
        });
}
