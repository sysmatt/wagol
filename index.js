import { createField } from './gol-field.js';

// --- Holding-page config -------------------------------------------------
// Edit these to customize the page. Leave image.src / text.content empty
// to omit that layer entirely.
const CONFIG = {
    theme: 'fire', // 'cosmic' | 'fire' | 'matrix' | 'slate'
    activityTheme: 'ice', // null | 'ice' | 'ember' | 'verdant' | 'violet'
    // Cumulative mode (default): each tick a cell is alive nudges its
    // background brightness up permanently (never fades), capped by
    // activityCap ticks-alive. Set false for the alternative EMA mode below,
    // which fades back toward black as a cell goes quiet.
    activityCumulative: true,
    activityCap: 200, // ticks-alive to reach full brightness in cumulative mode
    // EMA weight applied per simulation tick (not per frame); only used when
    // activityCumulative is false. Valid range is (0, 1] but useful range is
    // ~0.001-0.05. Half-life in ticks is ~0.693 / activityDecay:
    //   0.001 -> ~693 ticks (~11.6s @60 ticks/s) -- very slow drift
    //   0.005 -> ~139 ticks (~2.3s)  -- smooth heatmap w/ visible trails (default)
    //   0.02  -> ~35 ticks  (~0.6s)  -- fairly reactive, still smoothed
    //   0.05  -> ~14 ticks  (~0.2s)  -- starts to flicker with the sim itself
    //   0.1+  -> ~7 ticks or less    -- just mirrors raw cell state, no averaging
    // Note: ticksPerFrame elsewhere scales the wall-clock half-life (e.g.
    // ticksPerFrame: 3 makes it 3x slower in real time for the same value).
    activityDecay: 0.001,
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
        activityTheme: CONFIG.activityTheme,
        activityCumulative: CONFIG.activityCumulative,
        activityCap: CONFIG.activityCap,
        activityDecay: CONFIG.activityDecay,
        interactive: true,
        brush: CONFIG.brush,
    });
}

run();
