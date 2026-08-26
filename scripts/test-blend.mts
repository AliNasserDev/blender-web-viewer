/* Node smoke-test: parse .blend files and build three.js objects.
   Usage: npx tsx scripts/test-blend.mts <file.blend> [more.blend ...] */
import { readFileSync } from 'node:fs'
import * as THREE from 'three'
import { parseBlend, createObjects } from '../src/blend/index.js'

interface Row {
    file: string
    ok: boolean
    detail: string
}

const rows: Row[] = []
let failures = 0

for (const path of process.argv.slice(2)) {
    const name = path.split(/[\\/]/).pop() ?? path
    try {
        const buffer = readFileSync(path)
        const ab = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
        const file = await parseBlend(ab, name)
        const objects = createObjects(file)

        const counts = { mesh: 0, light: 0, camera: 0, group: 0 }
        let tris = 0
        let verts = 0
        for (const obj of objects) {
            obj.traverse(o => {
                const m = o as THREE.Mesh
                if (m.isMesh && m.geometry?.attributes.position) {
                    counts.mesh++
                    verts += m.geometry.attributes.position.count
                    tris += m.geometry.index ? m.geometry.index.count / 3 : m.geometry.attributes.position.count / 3
                } else if ((o as THREE.Light).isLight) counts.light++
                else if ((o as THREE.Camera).isCamera) counts.camera++
                else counts.group++
            })
        }
        const detail = `objects=${objects.length} meshes=${counts.mesh} tris=${tris | 0} verts=${verts} lights=${counts.light} cams=${counts.camera}`
        if (!counts.mesh) throw new Error(detail + ' — expected at least one mesh')
        rows.push({ file: name, ok: true, detail })
    } catch (err) {
        failures++
        rows.push({ file: name, ok: false, detail: err instanceof Error ? err.message : String(err) })
    }
}

for (const r of rows) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.file.padEnd(45)} ${r.detail}`)
process.exit(failures ? 1 : 0)
