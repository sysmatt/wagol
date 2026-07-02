# wagol

Conway's Game of Life, compiled to WebAssembly, doubling as a "site under construction" holding page.

The grid fills the browser window one cell per pixel, colored by an age-based palette. An optional image and text can be overlaid, centered on top of the simulation, for use as a maintenance/coming-soon page. Dragging the mouse scatters a randomized burst of live cells into the simulation.

## Project layout

```
wagol/
└── gol2/           — the "conweba" project: Rust/Wasm simulation core + web page
    ├── src/lib.rs   — Universe simulation (Rust, compiled to wasm32-unknown-unknown)
    ├── index.html   — page markup + overlay styling
    ├── index.js     — Wasm loader, render loop, mouse handling, overlay config
    └── Makefile     — build/serve/clean targets
```

Everything currently lives under `gol2/` — see [`gol2/README.md`](gol2/README.md) for full details on the simulation internals, the config options for the holding-page overlay (image/text/theme), and the Wasm API surface.

## Dependencies

The simulation compiles to `wasm32-unknown-unknown` (no C toolchain needed for that target itself), but the build tooling (`wasm-pack`) runs natively and needs a C compiler to build.

On Ubuntu:

```bash
sudo apt install rustup binaryen build-essential
rustup target add wasm32-unknown-unknown
cargo install wasm-pack
```

| Package | Why |
|---|---|
| `rustup` | Installs and manages the Rust toolchain (`rustc`, `cargo`) |
| `binaryen` | Provides `wasm-opt`, used by wasm-pack to optimize the compiled `.wasm` |
| `build-essential` | Native `gcc`/linker, needed to build `wasm-pack` and other host-side tooling |
| `wasm32-unknown-unknown` target | Added via `rustup target add`; not available as an apt package |
| `wasm-pack` | Not packaged for apt; installed via `cargo install wasm-pack` |

Python 3 is used for the dev server and ships with Ubuntu by default.

## Build and run

```bash
cd gol2
make serve    # build and serve at http://localhost:8080
make build    # build only, output in gol2/pkg/
make clean    # remove build artifacts
```
