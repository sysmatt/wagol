.PHONY: check-deps build serve clean tar.gz

# Toolchain is expected to already be installed system-wide:
#   sudo apt install rustup binaryen build-essential
#   rustup target add wasm32-unknown-unknown
#   cargo install wasm-pack
# See README.md for details.
export PATH := $(HOME)/.cargo/bin:$(PATH)

DIST_NAME := wagol.tar.gz
DIST_STAGE := .dist-stage

check-deps:
	@command -v rustc >/dev/null || { echo "rustc not found. See README.md for setup."; exit 1; }
	@command -v cargo >/dev/null || { echo "cargo not found. See README.md for setup."; exit 1; }
	@command -v wasm-pack >/dev/null || { echo "wasm-pack not found. Run: cargo install wasm-pack"; exit 1; }
	@rustup target list --installed | grep -q wasm32-unknown-unknown || { echo "wasm32-unknown-unknown target missing. Run: rustup target add wasm32-unknown-unknown"; exit 1; }

build: check-deps
	wasm-pack build --target web

serve: build
	python3 -m http.server 8080

clean:
	cargo clean
	rm -rf pkg

# Bundles only what's needed to deploy: both page entry points (the
# full-page holding page and the background-mode demo), the shared JS core,
# the built wasm-bindgen glue + .wasm (not the .d.ts/package.json cruft in
# pkg/), and any image assets referenced by CONFIG.
tar.gz: build
	rm -rf "$(DIST_STAGE)" "$(DIST_NAME)"
	mkdir -p "$(DIST_STAGE)/pkg"
	cp index.html index.js background.js background-demo.html gol-field.js "$(DIST_STAGE)/"
	cp pkg/wagol.js pkg/wagol_bg.wasm "$(DIST_STAGE)/pkg/"
	find . -maxdepth 1 -type f \( -iname '*.png' -o -iname '*.jpg' -o -iname '*.jpeg' \
		-o -iname '*.gif' -o -iname '*.svg' -o -iname '*.webp' \) \
		-exec cp {} "$(DIST_STAGE)/" \;
	tar -czf "$(DIST_NAME)" -C "$(DIST_STAGE)" .
	rm -rf "$(DIST_STAGE)"
	@echo "Created $(DIST_NAME)"
