/* Re-downloads the third-party test models used during development into
   samples/third-party/. These assets keep their original licenses and are
   NOT part of this repository. Usage: npm run fetch:samples */
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const BASE = new URL('../samples/third-party/', import.meta.url)

const ASSETS = [
    {
        file: 'Duck.glb',
        url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/Duck/glTF-Binary/Duck.glb',
        source: 'KhronosGroup/glTF-Sample-Assets · Models/Duck',
        license: '© Sony (distributed via Khronos sample assets)',
    },
    {
        file: 'DamagedHelmet.glb',
        url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/DamagedHelmet/glTF-Binary/DamagedHelmet.glb',
        source: 'KhronosGroup/glTF-Sample-Assets · Models/DamagedHelmet',
        license: 'CC BY 4.0 (ctxwing) / CC BY-NC 4.0 (theblueturtle_)',
    },
    {
        file: 'Fox.glb',
        url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/Fox/glTF-Binary/Fox.glb',
        source: 'KhronosGroup/glTF-Sample-Assets · Models/Fox',
        license: 'CC0 / CC BY 4.0 (PixelMannen, tomkranis, AsoboStudio, scurest)',
    },
    {
        file: 'IridescenceSuzanne.glb',
        url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/IridescenceSuzanne/glTF-Binary/IridescenceSuzanne.glb',
        source: 'KhronosGroup/glTF-Sample-Assets · Models/IridescenceSuzanne',
        license: 'CC BY 4.0 (Analytical Graphics, Inc.)',
    },
    {
        file: 'stanford-bunny.obj',
        url: 'https://raw.githubusercontent.com/alecjacobson/common-3d-test-models/master/data/stanford-bunny.obj',
        source: 'alecjacobson/common-3d-test-models',
        license: 'Stanford Scanning Repository (research use)',
    },
    {
        file: 'suzanne.obj',
        url: 'https://raw.githubusercontent.com/alecjacobson/common-3d-test-models/master/data/suzanne.obj',
        source: 'alecjacobson/common-3d-test-models',
        license: 'Blender Foundation mascot geometry',
    },
    {
        file: 'colored.stl',
        url: 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/stl/binary/colored.stl',
        source: 'mrdoob/three.js · examples/models/stl/binary',
        license: 'MIT (three.js examples)',
    },
    {
        file: 'SambaDancing.fbx',
        url: 'https://github.com/mrdoob/three.js/raw/dev/examples/models/fbx/Samba%20Dancing.fbx',
        source: 'mrdoob/three.js · examples/models/fbx',
        license: 'Unclear (mixamo-era demo asset, redistributed by three.js)',
    },
]

await mkdir(BASE, { recursive: true })
for (const a of ASSETS) {
    const res = await fetch(a.url)
    if (!res.ok) {
        console.error(`FAIL ${a.file}: HTTP ${res.status}`)
        continue
    }
    await writeFile(path.join(BASE.pathname, a.file), Buffer.from(await res.arrayBuffer()))
    console.log(`ok   ${a.file.padEnd(24)} ${((await res.clone().arrayBuffer()).byteLength / 1024) | 0} KB  — ${a.license}  [${a.source}]`)
}
console.log('\nDone. Files land in samples/third-party/ (git-ignored).')
