# Blender Web Viewer

A fully client-side web viewer for **Blender `.blend` files** — plus glTF, OBJ, FBX, STL, PLY and Collada. Files never leave your machine: everything (including the `.blend` binary parser) runs in the browser.

## 🔗 Use it now — no install

**https://alinasserdev.github.io/blender-web-viewer/**

Open it and you're immediately in a working 3D viewer:

- **Demos ▾** menu loads a studio scene, a vertex-colored `.glb`, or a real **`.blend`** file with one click
- Drag & drop any of `.blend / .glb / .gltf / .obj / .fbx / .stl / .ply / .dae` onto the page
- Orbit with the mouse, `F` re-frames, `W` wireframe, `G` grid, `R` spin

The repo is public at `https://github.com/AliNasserDev/blender-web-viewer` and
auto-deploys there on every push to `main` (`.github/workflows/deploy.yml` → `gh-pages`
branch). Local runs remain available too — see below. A fallback mirror is always at
`https://raw.githack.com/AliNasserDev/blender-web-viewer/gh-pages/index.html`.

## 💻 Run locally instead

```bash
npm install
npm run dev        # http://localhost:5173
```

Production build & preview:

```bash
npm run build      # typecheck + bundle → dist/
npm run preview
```

## Features

- **Client-side `.blend` parsing** (Blender 2.4x → 4.5+, uncompressed / gzip / Zstandard): meshes with n-gon triangulation, materials, lights, cameras
- Orbit camera with auto-framing, studio IBL lighting, soft shadows, grid
- Wireframe, spin, background presets, model-light toggle
- Scene tree (click to focus), mesh/tri/material stats
- Animation playback bar for skinned/rigged models
- PNG screenshots, multi-file drag & drop (`.obj + .mtl + textures`, `.gltf + .bin + textures`)
- Keyboard shortcuts (`F/G/W/R`)

## Format notes

| Format | Support |
|---|---|
| `.blend` | Meshes, materials, lights, cameras. Modifiers/particles are not evaluated; packed textures not extracted. For full fidelity export `.glb` from Blender. |
| `.glb/.gltf/.fbx/.dae` | Full loader support incl. animations |
| `.obj` | Geometry/materials via bundled MTL when dropped together |
| `.stl/.ply` | Binary + ASCII, vertex colors |

## Development

```bash
npm run test:blend     # parse .blend fixtures in Node, print geometry stats
npm run fetch:samples  # download third-party test models into samples/third-party/
node scripts/make-sample-glb.mjs   # regenerate public/models/knot.glb
```

### Samples

Demo assets ship from [`public/models/`](public/models/) so they work on the deployed site:

- `default-cube-blender45.blend` — the iconic default cube scene, saved from Blender 4.5
- `knot.glb` — procedurally generated torus knot with vertex colors

Well-known third-party test models are **not** redistributed; fetch them locally with `npm run fetch:samples` (per-asset licenses listed inside the script).

## How `.blend` parsing works

1. `src/blend/parser.js` — vendored [js.blend](https://github.com/acweathersby/js.blend) (MIT) reads the DNA/SDNA schema and block structure.
2. `src/blend/index.ts` — converts parsed Blender data-blocks into three.js objects (Z-up→Y-up transform fix, quad/n-gon fan triangulation, light/camera conversion). Adapted from [@threepipe/plugin-blend-importer](https://github.com/repalash/threepipe) (MIT).
3. Local fixes on top of js.blend:
   - unaligned typed-array fields in Blender ≥ 4.x (DataView fallback)
   - Zstandard-compressed files (Blender ≥ 3.0 default)
   - SDNA template cache reset between parses (crash isolation)
   - endianness handling that doesn't trust the file's stale flag

## Credits & licenses

- [three.js](https://github.com/mrdoob/three.js) — MIT
- [js.blend](https://github.com/acweathersby/js.blend) — MIT, © 2020 Anthony C. Weathersby
- [@threepipe/plugin-blend-importer](https://github.com/repalash/threepipe/tree/master/plugins/blend-importer) — MIT
- [fzstd](https://github.com/101arrowz/fzstd) — MIT (Zstandard decompression)

Third-party sample models keep their original licenses (see `scripts/fetch-samples.mjs`); they are not distributed with this repository.

## License

[MIT](./LICENSE)
