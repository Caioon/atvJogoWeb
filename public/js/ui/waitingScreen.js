export async function initializeWaitingScreen() {

    // Polling: quando a partida terminar, redireciona pro lobby
    const poll = setInterval(async () => {

        try {

            const res = await fetch('/api/game/state');
            const data = await res.json();

            if (data.status !== 'playing') {
                clearInterval(poll);
                window.location.href = '/lobby';
            }

        } catch (err) {
            console.error(err);
        }

    }, 2000);
}
