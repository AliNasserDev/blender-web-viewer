# Blender Web Viewer

A fully client-side web viewer for **Blender `.blend` files** — plus glTF, OBJ, FBX, STL, PLY and Collada. Files never leave your machine: everything (including the `.blend` binary parser) runs in the browser.

![formats](https://img.shields.io/badge/formats-.blend%20·%20glb%20·%20gltf%20·%20obj%20·%20fbx%20·%20stl%20·%20ply%20·%20dae-f5792a)

## Quick start

```bash
npm install
npm run dev        # http://localhost:5173
```

Drag a model onto the page, or use **Open file**. Multi-file drops work too — drop `.obj + .mtl + textures` or `.gltf + .bin + textures` together.

## Features

- **Client-side `.blend` parsing** (Blender 2.4x → 4.5+, uncompressed / gzip / Zstandard): meshes with n-gon triangulation, materials, lights, cameras
- Orbit camera with auto-framing, studio IBL lighting, soft shadows, grid
- Wireframe, spin, background presets, model-light toggle
- Scene tree (click to focus), mesh/tri/material stats
- Animation playback bar for skinned/rigged models
- PNG screenshots, drag & drop everywhere, keyboard shortcuts (`F/G/W/R`)
- Built-in procedural sample scene

## Format notes

| Format | Support |
|---|---|
| `.blend` | Meshes, materials, lights, cameras. Modifiers/particles are not evaluated; packed textures not extracted. For full fidelity export `.glb` from Blender. |
| `.glb/.gltf/.fbx/.dae` | Full loader support incl. animations |
| `.obj` | Geometry/materials via bundled MTL when dropped together |
| `.stl/.ply` | Binary + ASCII, vertex colors |

## Development

```bash
npm run dev            # vite dev server
npm run build          # typecheck + production build → dist/
npm run preview        # serve dist/
npm run test:blend     # parse .blend fixtures in Node, print geometry stats
npm run fetch:samples  # download third-party test models into samples/third-party/
```

### Samples

`samples/` contains only license-safe assets:

- `default-cube-blender45.blend` — the iconic default cube scene, saved from Blender 4.5
- `knot.glb` — procedurally generated torus knot with vertex colors (`scripts/make-sample-glb.mjs`)

Well-known third-party test models (Khronos Duck/DamagedHelmet/Fox, Stanford Bunny, three.js FBX/STL demos…) can be fetched locally with `npm run fetch:samples`; they land in `samples/third-party/` and stay out of the repository.

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

Third-party sample models keep their original licenses (see `scripts/fetch-samples.mjs` for per-asset attribution); they are not distributed with this repository.

## License

[MIT](./LICENSE)
