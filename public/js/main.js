import { initializeNameScreen }
from './ui/nameScreen.js';

import { initializeLobby }
from './ui/lobbyScreen.js';

import { initializeGameScreen }
from './ui/gameScreen.js';

import { initializeWaitingScreen }
from './ui/waitingScreen.js';

const page = document.body.dataset.page;

switch (page) {

    case 'home':
        initializeNameScreen();
        break;

    case 'lobby':
        initializeLobby();
        break;

    case 'game':
        initializeGameScreen();
        break;

    case 'waiting':
        initializeWaitingScreen();
        break;
}
