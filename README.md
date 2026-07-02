# wagol

Conway's Game of Life, compiled to WebAssembly. Two ways to use it:

- **Holding page** (`index.html`) — a full-viewport "under construction" / maintenance page: the simulation fills the whole browser window, with an optional centered image and text overlay, and interactive mouse scatter.
- **Background mode** (`background-demo.html`) — the simulation runs as a fixed, edge-to-edge backdrop behind your own page content, using a subdued color palette so it doesn't compete with foreground text.

Both share the same Rust/Wasm simulation core.

## How it works

The simulation is written in Rust and compiled to WebAssembly via `wasm-pack`. Each tick, the Wasm module computes the next generation using a double-buffered cell array and writes the result directly into a pre-allocated RGBA pixel buffer. JavaScript creates an `ImageData` view directly into Wasm linear memory (zero-copy) and blits it to a `<canvas>` each frame via `putImageData`.

- Edges wrap around (toroidal topology)
- Grid is re-randomized (~50% alive) on load and on window resize
- Cell color is driven by cell age and a selectable palette
- `gol-field.js` is the shared core (wasm init, render loop, resize handling, optional mouse-scatter interaction) used by both `index.js` and `background.js`

## Holding page

Open `index.html` (via `make serve`). Content and behavior are set via the `CONFIG` object at the top of `index.js`:

```js
const CONFIG = {
    theme: 'cosmic', // 'cosmic' | 'fire' | 'matrix' | 'slate'
    brush: { radius: 35, density: 0.35 },
    image: { src: '', opacity: 0.35, maxWidth: 320, maxHeightVh: 40 },
    text: { content: '', color: '#ffffff', fontSize: '1.5rem' },
};
```

Leave `image.src` or `text.content` empty to omit that layer. Both render as a centered, `pointer-events: none` overlay above the canvas, so mouse interaction always reaches the simulation. Dragging the mouse scatters a sparse, randomized burst of live cells rather than painting a solid blob.

## Background mode

Open `background-demo.html` for a working example, or wire it into your own page:

```html
<canvas id="gol-background"></canvas>
<script type="module" src="background.js"></script>
```

```css
#gol-background {
    position: fixed;
    inset: 0;
    z-index: -1;
    pointer-events: none;
    image-rendering: pixelated; /* keep the upscaled grid crisp, not blurry */
}
html, body { background: transparent; } /* let the canvas show through */
```

Give your actual content its own opaque background (a card/panel style) so it stays legible over the animated backdrop — see `background-demo.html` for the pattern.

Configured via `CONFIG` at the top of `background.js`:

```js
const CONFIG = {
    theme: 'slate',   // subdued blue-grey palette, meant for use behind real content
    cellSize: 4,       // CSS px per simulated cell — higher is chunkier and cheaper to run
    ticksPerFrame: 3,  // simulation speed — higher is slower/calmer
};
```

Background mode is non-interactive by default (no mouse scatter), since it sits behind real page content people are trying to read and click.

## Wasm API

The Rust library exposes a single `Universe` struct:

| Method | Description |
|---|---|
| `Universe.new(width, height, theme)` | Create and randomly seed a new universe. `theme` is `0` (fire), `1` (cosmic), `2` (matrix), or `3` (slate) |
| `universe.tick()` | Advance one generation |
| `universe.pixels_ptr()` | Pointer into Wasm memory for the RGBA pixel buffer |
| `universe.scatter_cells(x, y, radius, density)` | Randomly scatter live cells within `radius` of a point, with density (0–1) falling off toward the edge |
| `universe.resize(width, height)` | Reinitialize with new dimensions, keeping the current theme |
| `wasm_memory()` | Returns the `WebAssembly.Memory` object for direct buffer access |

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

`make build` checks these are present and gives a hint if something's missing.

## Build and run

```bash
make serve       # build and start server at http://localhost:8080
make build       # build only (output in pkg/)
make tar.gz      # build a deployable wagol.tar.gz (html/js/wasm/images only, both entry points)
make clean       # remove build artifacts
```

## Deployment

Keep a single canonical checkout of this repo on the server (`git pull` in place, or extract a fresh `make tar.gz` over it) and reference that checkout from your docroot rather than copying files around — then `git pull && make build` (or a fresh tarball extract) is the entire update process, and nothing else needs to change.

### Background mode on an existing site

No symlinks needed at all. `<script type="module">` resolves its own relative imports (`gol-field.js`'s `./pkg/wagol.js`, `background.js`'s `./gol-field.js`) against *the script file's own URL*, not the URL of the page that included it. So as long as the checkout lives at a fixed path — say `/var/www/html/wagol/` — any page anywhere on the site, at any depth, can pull in the background with one absolute-path script tag:

```html
<canvas id="gol-background"></canvas>
<script type="module" src="/wagol/background.js"></script>
```

That's it. The checkout is the single source of truth for every page using it; there's nothing to keep in sync.

### Holding page as the site root

A maintenance page needs to be reachable at `/`, not `/wagol/index.html`, so something has to bridge the docroot root to the checkout. Two options:

**Symlink the individual runtime files up to the docroot root** (works with any static file server, no webserver config required):

```bash
cd /var/www/html
ln -s wagol/index.html     index.html
ln -s wagol/index.js       index.js
ln -s wagol/gol-field.js   gol-field.js
ln -s wagol/pkg            pkg
ln -s wagol/blank-page.png blank-page.png   # plus any other image(s) CONFIG.image.src refers to
```

This works because `index.html`/`index.js`/`gol-field.js` only ever reference each other by relative path — the symlinks just need to keep them siblings, wherever that ends up being served from. Re-running `make build` (or re-extracting a tarball) inside `wagol/` updates the live site immediately; you only need to touch the symlinks again if you add a *new* top-level asset file.

If you're on Apache, confirm `Options +FollowSymLinks` (or `+SymLinksIfOwnerMatch`) is enabled for the docroot — some default configs don't follow symlinks otherwise. Nginx follows them by default.

**Or point the docroot straight at the checkout** for the duration of the outage — swap your webserver's `root`/`DocumentRoot` to the `wagol` checkout (or maintain a `current -> wagol` symlink your vhost root points through, then swap it back once the real site is ready). This is the classic atomic-swap maintenance-mode pattern, and is cleaner than the file-symlink approach if the holding page is meant to fully replace the site temporarily rather than live alongside it.

## Project structure

```
wagol/
├── Cargo.toml          — Rust package definition
├── Makefile             — build/serve/tar.gz/clean targets
├── src/lib.rs            — Universe simulation (Rust, compiled to wasm32-unknown-unknown)
├── gol-field.js           — shared JS core (wasm init, render loop, resize, mouse scatter)
├── index.html / index.js   — holding-page entry point
├── background-demo.html / background.js — background-mode entry point + example page
├── blank-page.png          — example overlay image for the holding page
└── pkg/                     — generated by wasm-pack (not committed)
    ├── wagol.js
    └── wagol_bg.wasm
```
