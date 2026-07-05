// Shared core: wires a wasm Universe up to a <canvas> and a render loop.
// Used by both index.js (full-page holding page) and background.js
// (backdrop behind arbitrary page content).
import init, { Universe, wasm_memory } from './pkg/wagol.js';

export const THEME_IDS = { fire: 0, cosmic: 1, matrix: 2, slate: 3 };

// Background "activity" palettes: paint dead cells with a running average of
// how often they've recently been alive, instead of flat black. Independent
// of THEME_IDS above -- any foreground theme can pair with any activity
// theme (or none, which reproduces the original flat-black behavior).
export const ACTIVITY_THEME_IDS = { ice: 0, ember: 1, verdant: 2, violet: 3 };

let wasmReady = null;
function ensureWasm() {
    if (!wasmReady) wasmReady = init();
    return wasmReady;
}

const defaultSizeSource = () => ({ width: window.innerWidth, height: window.innerHeight });

/**
 * Starts a Game of Life simulation rendering into `canvas`.
 *
 * options:
 *   theme         'fire' | 'cosmic' | 'matrix' | 'slate' (default 'cosmic')
 *   activityTheme 'ice' | 'ember' | 'verdant' | 'violet' | null (default
 *                 null). When set, cells that are currently dead are shaded
 *                 by a running average of how often they've recently been
 *                 alive, instead of flat black -- a low-key heatmap of
 *                 activity that fills in the empty space once the
 *                 simulation settles down. Independent of `theme`, so any
 *                 combination works.
 *   activityCumulative
 *                 If true (default), the activity heatmap is a saturating
 *                 cumulative count -- each tick a cell is alive nudges it
 *                 permanently brighter (capped by activityCap), and it never
 *                 fades. If false, it's an exponential moving average that
 *                 decays back toward black as a cell goes quiet (tune with
 *                 activityDecay). Only relevant when activityTheme is set.
 *   activityCap   Ticks-alive needed to reach full brightness in cumulative
 *                 mode (default 200). Only relevant when activityCumulative
 *                 is true.
 *   activityDecay EMA decay rate per tick for the activity heatmap (default
 *                 0.005). Smaller = longer memory / slower fade, larger =
 *                 more reactive to recent activity. Only relevant when
 *                 activityCumulative is false.
 *   cellSize      CSS pixels per simulated cell (default 1). Values > 1
 *                 simulate a smaller grid and let the browser upscale the
 *                 canvas, which is both cheaper to compute and reads as a
 *                 chunkier, calmer backdrop.
 *   ticksPerFrame Advance the simulation once every N animation frames
 *                 (default 1 = every frame). Higher values slow the
 *                 simulation down and reduce CPU/GPU load.
 *   interactive   If true, dragging the mouse over the canvas scatters live
 *                 cells (default false).
 *   brush         { radius, density } for the interactive scatter brush.
 *   sizeSource    () => { width, height } the field should fill. Defaults
 *                 to the full browser viewport.
 *
 * Returns { universe, destroy() }.
 */
export async function createField(canvas, options = {}) {
    await ensureWasm();

    const {
        theme = 'cosmic',
        activityTheme = null,
        activityCumulative,
        activityCap,
        activityDecay,
        cellSize = 1,
        ticksPerFrame = 1,
        interactive = false,
        brush = { radius: 35, density: 0.35 },
        sizeSource = defaultSizeSource,
    } = options;

    const ctx = canvas.getContext('2d');
    const mem = wasm_memory();
    const themeId = THEME_IDS[theme] ?? THEME_IDS.cosmic;
    const activityThemeId = activityTheme == null ? undefined : (ACTIVITY_THEME_IDS[activityTheme] ?? ACTIVITY_THEME_IDS.ice);

    let gridWidth = 0;
    let gridHeight = 0;
    let universe = null;
    let animId = null;
    let frameCount = 0;

    function applySize() {
        const { width, height } = sizeSource();
        gridWidth = Math.max(1, Math.ceil(width / cellSize));
        gridHeight = Math.max(1, Math.ceil(height / cellSize));
        canvas.width = gridWidth;
        canvas.height = gridHeight;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
    }

    applySize();
    universe = Universe.new(gridWidth, gridHeight, themeId, activityThemeId, activityDecay, activityCumulative, activityCap);

    function getGridPos(clientX, clientY) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = gridWidth / rect.width;
        const scaleY = gridHeight / rect.height;
        return {
            x: Math.floor((clientX - rect.left) * scaleX),
            y: Math.floor((clientY - rect.top) * scaleY),
        };
    }

    let isDrawing = false;
    function onMouseDown(e) {
        isDrawing = true;
        const { x, y } = getGridPos(e.clientX, e.clientY);
        universe.scatter_cells(x, y, brush.radius, brush.density);
    }
    function onMouseMove(e) {
        if (!isDrawing) return;
        const { x, y } = getGridPos(e.clientX, e.clientY);
        universe.scatter_cells(x, y, brush.radius, brush.density);
    }
    function onMouseUp() { isDrawing = false; }

    // Touch equivalents of the mouse handlers above, so dragging a finger
    // scatters cells the same way dragging the mouse does. preventDefault()
    // stops the touch from scrolling/zooming the page while drawing.
    function onTouchStart(e) {
        e.preventDefault();
        isDrawing = true;
        const touch = e.touches[0];
        const { x, y } = getGridPos(touch.clientX, touch.clientY);
        universe.scatter_cells(x, y, brush.radius, brush.density);
    }
    function onTouchMove(e) {
        if (!isDrawing) return;
        e.preventDefault();
        const touch = e.touches[0];
        const { x, y } = getGridPos(touch.clientX, touch.clientY);
        universe.scatter_cells(x, y, brush.radius, brush.density);
    }
    function onTouchEnd() { isDrawing = false; }

    if (interactive) {
        canvas.addEventListener('mousedown', onMouseDown);
        canvas.addEventListener('mousemove', onMouseMove);
        canvas.addEventListener('mouseup', onMouseUp);
        canvas.addEventListener('mouseleave', onMouseUp);
        canvas.addEventListener('touchstart', onTouchStart, { passive: false });
        canvas.addEventListener('touchmove', onTouchMove, { passive: false });
        canvas.addEventListener('touchend', onTouchEnd);
        canvas.addEventListener('touchcancel', onTouchEnd);
    }

    function render() {
        if (frameCount % ticksPerFrame === 0) {
            universe.tick();
            const ptr = universe.pixels_ptr();
            const pixels = new Uint8ClampedArray(mem.buffer, ptr, gridWidth * gridHeight * 4);
            ctx.putImageData(new ImageData(pixels, gridWidth, gridHeight), 0, 0);
        }
        frameCount++;
        animId = requestAnimationFrame(render);
    }

    function onResize() {
        cancelAnimationFrame(animId);
        applySize();
        universe.resize(gridWidth, gridHeight);
        animId = requestAnimationFrame(render);
    }
    window.addEventListener('resize', onResize);

    animId = requestAnimationFrame(render);

    return {
        universe,
        destroy() {
            cancelAnimationFrame(animId);
            window.removeEventListener('resize', onResize);
            if (interactive) {
                canvas.removeEventListener('mousedown', onMouseDown);
                canvas.removeEventListener('mousemove', onMouseMove);
                canvas.removeEventListener('mouseup', onMouseUp);
                canvas.removeEventListener('mouseleave', onMouseUp);
                canvas.removeEventListener('touchstart', onTouchStart);
                canvas.removeEventListener('touchmove', onTouchMove);
                canvas.removeEventListener('touchend', onTouchEnd);
                canvas.removeEventListener('touchcancel', onTouchEnd);
            }
        },
    };
}
