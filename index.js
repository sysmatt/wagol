import { createField } from './gol-field.js';

// --- Holding-page config -------------------------------------------------
// Edit these to customize the page. Leave image.src / text.content empty
// to omit that layer entirely.
const CONFIG = {
    theme: 'cosmic', // 'cosmic' | 'fire' | 'matrix' | 'slate'
    brush: {
        radius: 35,
        density: 0.35,
    },
    image: {
        src: 'blank-page.png',
        opacity: 0.65,
        maxWidth: 1024,
        maxHeightVh: 80,
    },
    text: {
        content: 'This system does not yet exist.',
        color: '#ffffff',
        fontSize: '3.5rem',
    },
};

function applyOverlay(config) {
    const imageEl = document.getElementById('overlay-image');
    if (config.image.src) {
        imageEl.src = config.image.src;
        imageEl.style.opacity = String(config.image.opacity);
        imageEl.style.width = `min(${config.image.maxWidth}px, 90vw)`;
        imageEl.style.height = 'auto';
        imageEl.style.maxHeight = `${config.image.maxHeightVh}vh`;
        imageEl.style.display = 'block';
    }

    const textEl = document.getElementById('overlay-text');
    if (config.text.content) {
        textEl.textContent = config.text.content;
        textEl.style.color = config.text.color;
        textEl.style.fontSize = config.text.fontSize;
        textEl.style.display = 'block';
    }
}

async function run() {
    applyOverlay(CONFIG);

    const canvas = document.getElementById('canvas');
    await createField(canvas, {
        theme: CONFIG.theme,
        interactive: true,
        brush: CONFIG.brush,
    });
}

run();
