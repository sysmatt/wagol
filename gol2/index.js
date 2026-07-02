import init, { Universe, wasm_memory } from './pkg/conweba.js';

// --- Holding-page config -------------------------------------------------
// Edit these to customize the page. Leave image.src / text.content empty
// to omit that layer entirely.
const CONFIG = {
    theme: 'cosmic', // 'cosmic' | 'fire' | 'matrix'
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

const THEME_IDS = { fire: 0, cosmic: 1, matrix: 2 };

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
    await init();
    applyOverlay(CONFIG);

    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const mem = wasm_memory();

    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    const themeId = THEME_IDS[CONFIG.theme] ?? THEME_IDS.cosmic;
    let universe = Universe.new(width, height, themeId);
    let animId = null;

    // Mouse drawing: scattered burst of live cells, more visually impactful
    // than a filled disc and gives the simulation a real kick.
    let isDrawing = false;
    const { radius: BRUSH_RADIUS, density: BRUSH_DENSITY } = CONFIG.brush;

    function getPos(e) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: Math.floor(e.clientX - rect.left),
            y: Math.floor(e.clientY - rect.top),
        };
    }

    canvas.addEventListener('mousedown', (e) => {
        isDrawing = true;
        const { x, y } = getPos(e);
        universe.scatter_cells(x, y, BRUSH_RADIUS, BRUSH_DENSITY);
    });
    canvas.addEventListener('mousemove', (e) => {
        if (!isDrawing) return;
        const { x, y } = getPos(e);
        universe.scatter_cells(x, y, BRUSH_RADIUS, BRUSH_DENSITY);
    });
    canvas.addEventListener('mouseup', () => { isDrawing = false; });
    canvas.addEventListener('mouseleave', () => { isDrawing = false; });

    function render() {
        universe.tick();
        const ptr = universe.pixels_ptr();
        const pixels = new Uint8ClampedArray(mem.buffer, ptr, width * height * 4);
        ctx.putImageData(new ImageData(pixels, width, height), 0, 0);
        animId = requestAnimationFrame(render);
    }

    window.addEventListener('resize', () => {
        cancelAnimationFrame(animId);
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;
        universe.resize(width, height);
        animId = requestAnimationFrame(render);
    });

    animId = requestAnimationFrame(render);
}

run();
