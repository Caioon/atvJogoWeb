import { appState } from '../state.js';

export function initializeNameScreen() {

  const input = document.getElementById('name-input');
  const error = document.getElementById('name-error');
  const btn = document.getElementById('btn-enter');

  async function enterLobby() {

    const name = input.value.trim();

    if (!name.length) {
      error.classList.add('visible');
      return;
    }

    try {

      const response = await fetch(
        '/api/register-name',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name
          })
        }
      );

      if (!response.ok) {
        throw new Error();
      }

      appState.playerName = name;

      sessionStorage.setItem(
        'playerName',
        name
      );

      window.location.href = '/lobby';

    } catch {

      error.textContent =
        'Erro ao conectar ao servidor';

      error.classList.add('visible');
    }
  }
  btn.addEventListener('click', enterLobby);

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') enterLobby();
  });
}
