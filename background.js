import { createField } from './gol-field.js';

// --- Background-mode config ----------------------------------------------
// Sits behind your page content rather than owning the whole page. See
// background-demo.html for how to wire the canvas + CSS into your own page.
const CONFIG = {
    theme: 'slate', // 'slate' | 'cosmic' | 'fire' | 'matrix'
    activityTheme: null, // null | 'ice' | 'ember' | 'verdant' | 'violet'
    activityCumulative: true, // true = never fades, saturates at activityCap; false = EMA fade (activityDecay)
    activityCap: 200, // ticks-alive to reach full brightness in cumulative mode
    activityDecay: 0.005, // EMA fade rate, only used when activityCumulative is false
    cellSize: 4,     // CSS px per simulated cell — higher is chunkier and cheaper
    ticksPerFrame: 3, // simulation speed — higher is slower/calmer
};

const canvas = document.getElementById('gol-background');
createField(canvas, {
    theme: CONFIG.theme,
    activityTheme: CONFIG.activityTheme,
    activityCumulative: CONFIG.activityCumulative,
    activityCap: CONFIG.activityCap,
    activityDecay: CONFIG.activityDecay,
    cellSize: CONFIG.cellSize,
    ticksPerFrame: CONFIG.ticksPerFrame,
    interactive: false,
});
