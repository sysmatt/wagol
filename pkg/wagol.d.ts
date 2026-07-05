/* tslint:disable */
/* eslint-disable */

export class Universe {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    static new(width: number, height: number, theme: number, bg_theme?: number | null, activity_decay?: number | null): Universe;
    pixels_ptr(): number;
    resize(width: number, height: number): void;
    /**
     * Sparsely scatter live cells within `radius` of (x, y), with per-cell
     * probability falling off toward the edge and scaled by `density`
     * (0..1). Produces a scattered burst rather than a solid painted disc.
     */
    scatter_cells(x: number, y: number, radius: number, density: number): void;
    tick(): void;
}

export function wasm_memory(): any;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_universe_free: (a: number, b: number) => void;
    readonly universe_new: (a: number, b: number, c: number, d: number, e: number) => number;
    readonly universe_pixels_ptr: (a: number) => number;
    readonly universe_resize: (a: number, b: number, c: number) => void;
    readonly universe_scatter_cells: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly universe_tick: (a: number) => void;
    readonly wasm_memory: () => any;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
