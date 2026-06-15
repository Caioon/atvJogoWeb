export const keys = {};
export const pressed = {};

document.addEventListener('keydown', e => {
    if (!keys[e.code]) {
        pressed[e.code] = true;
    }
    keys[e.code] = true;
});

document.addEventListener('keyup', e => {
    keys[e.code] = false;
});

export function clearPressed() {
    for (const key in pressed) {
        delete pressed[key];
    }
}

// --- Controles mobile ---

export function initializeMobileControls() {

    const isMobile =
        /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ||
        window.matchMedia('(pointer: coarse)').matches;

    if (!isMobile) return;

    const hint = document.getElementById('controls-hint');
    if (hint) hint.style.display = 'none';

    const container = document.getElementById('mobile-controls');
    if (!container) return;

    container.style.display = 'flex';

    function hold(code) {
        keys[code] = true;
    }

    function release(code) {
        keys[code] = false;
    }

    function bindButton(id, code) {

        const btn = document.getElementById(id);
        if (!btn) return;

        btn.addEventListener('touchstart', e => {
            e.preventDefault();
            hold(code);
            if (code === 'Space') pressed[code] = true;
        }, { passive: false });

        btn.addEventListener('touchend', e => {
            e.preventDefault();
            release(code);
        }, { passive: false });

        btn.addEventListener('touchcancel', e => {
            e.preventDefault();
            release(code);
        }, { passive: false });
    }

    bindButton('btn-mobile-left',  'ArrowLeft');
    bindButton('btn-mobile-right', 'ArrowRight');
    bindButton('btn-mobile-jump',  'Space');
}
