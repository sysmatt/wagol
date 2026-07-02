import { createField } from './gol-field.js';

// --- Background-mode config ----------------------------------------------
// Sits behind your page content rather than owning the whole page. See
// background-demo.html for how to wire the canvas + CSS into your own page.
const CONFIG = {
    theme: 'slate', // 'slate' | 'cosmic' | 'fire' | 'matrix'
    cellSize: 4,     // CSS px per simulated cell — higher is chunkier and cheaper
    ticksPerFrame: 3, // simulation speed — higher is slower/calmer
};

const canvas = document.getElementById('gol-background');
createField(canvas, {
    theme: CONFIG.theme,
    cellSize: CONFIG.cellSize,
    ticksPerFrame: CONFIG.ticksPerFrame,
    interactive: false,
});
