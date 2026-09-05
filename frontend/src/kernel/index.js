/**
 * The Rust geometry kernel, loaded and ready to call.
 *
 * The kernel lives in a separate repo (`../../wasm`, `shed-cad-rs`) and is
 * compiled to WebAssembly. It owns the geometry this app used to compute in
 * JavaScript: where an Opening sits on a wall, what a roof line looks like,
 * where every piece of trim goes. See that repo's `docs/adr/0002` for why.
 *
 * Everything the kernel exports is re-exported from here, so a caller writes
 * `import { wallSpan } from '../kernel'` and never sees the generated glue.
 *
 * # Initialisation
 *
 * The module is initialised at import time, with a top-level await, so every
 * export below is a plain synchronous function by the time anyone can call one.
 * That is deliberate: `wallSpan` is called from render paths and from module
 * scope in tests, and an async kernel would turn all of them async.
 *
 * The cost is real and worth stating: the wasm module is now load-bearing for
 * first paint. If it fails to load, the shed does not render at all rather than
 * rendering wrongly. That trade is `docs/adr/0002`'s, made knowingly.
 *
 * # Rebuilding
 *
 * `pkg/` is generated and gitignored. After a change to the Rust:
 *
 *     cd ../../wasm && tools/build-wasm.sh --target web \
 *         --out ../threejs/shed_app/frontend/src/kernel/pkg
 */
import init, { initSync } from './pkg/shed_cad.js';

const wasm = new URL('./pkg/shed_cad_bg.wasm', import.meta.url);

// Node has no `fetch` for a file: URL, and the browser has no `fs`. Vite
// rewrites the `new URL(..., import.meta.url)` above into an asset URL, so the
// browser branch needs nothing else; vitest runs under Node, where the bytes
// have to be read.
if (typeof process !== 'undefined' && process.versions?.node) {
	const { readFile } = await import('node:fs/promises');
	const { fileURLToPath } = await import('node:url');
	initSync({ module: await readFile(fileURLToPath(wasm)) });
} else {
	await init({ module_or_path: wasm });
}

export * from './pkg/shed_cad.js';
