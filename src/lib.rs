use wasm_bindgen::prelude::*;

/// (t, r, g, b) color stops, t in [0, 1], sorted ascending.
type Stops = &'static [(f32, u8, u8, u8)];

const FIRE_STOPS: Stops = &[
    (0.0, 255, 255, 255),
    (0.25, 255, 255, 0),
    (0.5, 255, 128, 0),
    (0.75, 255, 0, 0),
    (1.0, 100, 0, 0),
];

const COSMIC_STOPS: Stops = &[
    (0.0, 255, 255, 255),
    (0.1, 180, 220, 255),
    (0.35, 80, 120, 255),
    (0.65, 60, 40, 160),
    (1.0, 20, 10, 40),
];

const MATRIX_STOPS: Stops = &[
    (0.0, 200, 255, 200),
    (0.3, 80, 255, 90),
    (0.7, 0, 140, 40),
    (1.0, 0, 20, 5),
];

// Low-contrast, desaturated blue-grey — for use as a page background behind
// real content, where the simulation shouldn't compete with foreground text.
const SLATE_STOPS: Stops = &[
    (0.0, 190, 200, 210),
    (0.3, 120, 130, 145),
    (0.7, 70, 75, 90),
    (1.0, 25, 25, 32),
];

const THEME_FIRE: u8 = 0;
const THEME_COSMIC: u8 = 1;
const THEME_MATRIX: u8 = 2;
const THEME_SLATE: u8 = 3;

fn lerp_stops(t: f32, stops: Stops) -> (u8, u8, u8) {
    for w in stops.windows(2) {
        let (t0, r0, g0, b0) = w[0];
        let (t1, r1, g1, b1) = w[1];
        if t <= t1 {
            let s = ((t - t0) / (t1 - t0)).max(0.0);
            let lerp = |a: u8, b: u8| (a as f32 + (b as f32 - a as f32) * s) as u8;
            return (lerp(r0, r1), lerp(g0, g1), lerp(b0, b1));
        }
    }
    let last = stops[stops.len() - 1];
    (last.1, last.2, last.3)
}

fn theme_stops(theme: u8) -> Stops {
    match theme {
        THEME_FIRE => FIRE_STOPS,
        THEME_COSMIC => COSMIC_STOPS,
        THEME_MATRIX => MATRIX_STOPS,
        THEME_SLATE => SLATE_STOPS,
        _ => FIRE_STOPS,
    }
}

#[wasm_bindgen]
pub struct Universe {
    width: u32,
    height: u32,
    theme: u8,
    cells: Vec<u8>,
    next: Vec<u8>,
    age: Vec<u32>,
    next_age: Vec<u32>,
    pixels: Vec<u8>,
}

impl Universe {
    fn age_to_color(&self, age: u32) -> (u8, u8, u8) {
        if age == 0 {
            return (0, 0, 0);
        }
        let t = ((age - 1) as f32 / 100.0).min(1.0);
        lerp_stops(t, theme_stops(self.theme))
    }

    fn seed(width: u32, height: u32, theme: u8) -> Universe {
        let size = (width * height) as usize;
        let cells: Vec<u8> = (0..size)
            .map(|_| if js_sys::Math::random() < 0.5 { 1 } else { 0 })
            .collect();
        let age: Vec<u32> = cells.iter().map(|&c| c as u32).collect();

        let mut universe = Universe {
            width,
            height,
            theme,
            cells,
            next: vec![0u8; size],
            age,
            next_age: vec![0u32; size],
            pixels: vec![0u8; size * 4],
        };

        for i in 0..size {
            let (r, g, b) = universe.age_to_color(universe.age[i]);
            universe.pixels[i * 4] = r;
            universe.pixels[i * 4 + 1] = g;
            universe.pixels[i * 4 + 2] = b;
            universe.pixels[i * 4 + 3] = 255;
        }

        universe
    }
}

#[wasm_bindgen]
impl Universe {
    pub fn new(width: u32, height: u32, theme: u8) -> Universe {
        Universe::seed(width, height, theme)
    }

    pub fn tick(&mut self) {
        let w = self.width as usize;
        let h = self.height as usize;

        for row in 0..h {
            let row_n = if row == 0 { h - 1 } else { row - 1 };
            let row_s = if row == h - 1 { 0 } else { row + 1 };

            for col in 0..w {
                let col_w = if col == 0 { w - 1 } else { col - 1 };
                let col_e = if col == w - 1 { 0 } else { col + 1 };

                let live = self.cells[row_n * w + col_w]
                    + self.cells[row_n * w + col]
                    + self.cells[row_n * w + col_e]
                    + self.cells[row * w + col_w]
                    + self.cells[row * w + col_e]
                    + self.cells[row_s * w + col_w]
                    + self.cells[row_s * w + col]
                    + self.cells[row_s * w + col_e];

                let idx = row * w + col;
                let alive = matches!((self.cells[idx], live), (1, 2) | (1, 3) | (0, 3));
                self.next[idx] = alive as u8;
                self.next_age[idx] = if alive { self.age[idx] + 1 } else { 0 };

                let (r, g, b) = self.age_to_color(self.next_age[idx]);
                self.pixels[idx * 4] = r;
                self.pixels[idx * 4 + 1] = g;
                self.pixels[idx * 4 + 2] = b;
            }
        }

        std::mem::swap(&mut self.cells, &mut self.next);
        std::mem::swap(&mut self.age, &mut self.next_age);
    }

    pub fn pixels_ptr(&self) -> *const u8 {
        self.pixels.as_ptr()
    }

    /// Sparsely scatter live cells within `radius` of (x, y), with per-cell
    /// probability falling off toward the edge and scaled by `density`
    /// (0..1). Produces a scattered burst rather than a solid painted disc.
    pub fn scatter_cells(&mut self, x: i32, y: i32, radius: i32, density: f64) {
        let w = self.width as i32;
        let h = self.height as i32;
        let r2 = (radius * radius) as f64;

        for dy in -radius..=radius {
            for dx in -radius..=radius {
                let dist_sq = (dx * dx + dy * dy) as f64;
                if dist_sq > r2 {
                    continue;
                }
                let falloff = 1.0 - (dist_sq.sqrt() / radius as f64);
                if js_sys::Math::random() >= density * falloff {
                    continue;
                }

                let nx = x + dx;
                let ny = y + dy;
                if nx < 0 || nx >= w || ny < 0 || ny >= h {
                    continue;
                }

                let idx = (ny * w + nx) as usize;
                self.cells[idx] = 1;
                if self.age[idx] == 0 {
                    self.age[idx] = 1;
                }
                let (r, g, b) = self.age_to_color(self.age[idx]);
                self.pixels[idx * 4] = r;
                self.pixels[idx * 4 + 1] = g;
                self.pixels[idx * 4 + 2] = b;
            }
        }
    }

    pub fn resize(&mut self, width: u32, height: u32) {
        *self = Universe::seed(width, height, self.theme);
    }
}

#[wasm_bindgen]
pub fn wasm_memory() -> JsValue {
    wasm_bindgen::memory()
}
