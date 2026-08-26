/* Generates samples/knot.glb — an original, license-free torus-knot model
   with vertex colors. Usage: node scripts/make-sample-glb.mjs */
import { writeFileSync } from 'node:fs'

const P = 2, Q = 3          // torus knot winding
const TUBULAR = 128         // segments along the curve
const RADIAL = 20           // segments around the tube
const RADIUS = 1.0
const TUBE = 0.32

// --- geometry ---------------------------------------------------------------
const positions = []
const colors = []

function knotPoint(u) {
    // three.js-style torus knot curve, p/q interleave
    const cu = Math.cos(Q * u), su = Math.sin(Q * u)
    const quOverP = Q / P
    const cs = Math.cos(quOverP * u)
    return [
        RADIUS * (2 + cs) * 0.5 * Math.cos(P * u),
        RADIUS * (2 + cs) * 0.5 * Math.sin(P * u),
        RADIUS * su * 0.5,
    ]
}

for (let i = 0; i <= TUBULAR; i++) {
    const u = (i / TUBULAR) * P * Math.PI * 2

    // Frenet-ish frame from finite differences
    const p0 = knotPoint(u)
    const p1 = knotPoint(u + 0.001)
    const T = norm(sub(p1, p0))
    const N = norm(sub(p1, add(p0, scale(T, dot(sub(p1, p0), T)))))
    const B = cross(T, N)

    const hue = i / TUBULAR
    const [r, g, b] = hsl(hue, 0.75, 0.55)

    for (let j = 0; j <= RADIAL; j++) {
        const v = (j / RADIAL) * Math.PI * 2
        const cx = -TUBE * Math.cos(v)
        const cy = TUBE * Math.sin(v)
        positions.push(
            p0[0] + cx * N[0] + cy * B[0],
            p0[1] + cx * N[1] + cy * B[1],
            p0[2] + cx * N[2] + cy * B[2],
        )
        colors.push(r, g, b)
    }
}

const indices = []
const row = RADIAL + 1
for (let i = 0; i < TUBULAR; i++) {
    for (let j = 0; j < RADIAL; j++) {
        const a = i * row + j
        const b = a + row
        indices.push(a, b, a + 1, b, b + 1, a + 1)
    }
}

// --- GLB assembly -------------------------------------------------------------
const posArr = new Float32Array(positions)
const colArr = new Float32Array(colors)
const idxArr = new Uint32Array(indices)

let bboxMin = [Infinity, Infinity, Infinity]
let bboxMax = [-Infinity, -Infinity, -Infinity]
for (let i = 0; i < posArr.length; i += 3) {
    for (let k = 0; k < 3; k++) {
        bboxMin[k] = Math.min(bboxMin[k], posArr[i + k])
        bboxMax[k] = Math.max(bboxMax[k], posArr[i + k])
    }
}

const json = {
    asset: { version: '2.0', generator: 'blender-web-viewer make-sample-glb' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0, name: 'TorusKnot' }],
    meshes: [{
        name: 'TorusKnot',
        primitives: [{ attributes: { POSITION: 0, COLOR_0: 1 }, indices: 2, material: 0 }],
    }],
    materials: [{
        name: 'KnotMat',
        doubleSided: true,
        pbrMetallicRoughness: { baseColorFactor: [1, 1, 1, 1], metallicFactor: 0.15, roughnessFactor: 0.35 },
    }],
    accessors: [
        { bufferView: 0, componentType: 5126, count: posArr.length / 3, type: 'VEC3', min: bboxMin, max: bboxMax },
        { bufferView: 1, componentType: 5126, count: colArr.length / 3, type: 'VEC3' },
        { bufferView: 2, componentType: 5125, count: idxArr.length, type: 'SCALAR' },
    ],
    bufferViews: [
        { buffer: 0, byteOffset: 0, byteLength: posArr.byteLength, target: 34962 },
        { buffer: 0, byteOffset: align(posArr.byteLength, 4), byteLength: colArr.byteLength, target: 34962 },
        { buffer: 0, byteOffset: align(posArr.byteLength + colArr.byteLength, 4), byteLength: idxArr.byteLength, target: 34963 },
    ],
    buffers: [{ byteLength: align(posArr.byteLength, 4) + colArr.byteLength + idxArr.byteLength }],
}

const enc = new TextEncoder()
const jsonChunk = pad(enc.encode(JSON.stringify(json)), 4, 0x20)
const binPart1 = new Uint8Array(align(posArr.byteLength, 4))
binPart1.set(new Uint8Array(posArr.buffer))
const binPart2 = new Uint8Array(colArr.buffer)
const binPart3 = new Uint8Array(idxArr.buffer)
const bin = concat([binPart1, binPart2, pad(binPart3, 4, 0x00)])

const header = new ArrayBuffer(12)
const hv = new DataView(header)
hv.setUint32(0, 0x46546c67, true)   // 'glTF'
hv.setUint32(4, 2, true)
hv.setUint32(8, 12 + 8 + jsonChunk.byteLength + 8 + bin.byteLength, true)

const jsonHeader = new ArrayBuffer(8)
new DataView(jsonHeader).setUint32(0, jsonChunk.byteLength, true)
new DataView(jsonHeader).setUint32(4, 0x4e4f534a, true) // 'JSON'

const binHeader = new ArrayBuffer(8)
new DataView(binHeader).setUint32(0, bin.byteLength, true)
new DataView(binHeader).setUint32(4, 0x004e4942, true) // 'BIN\0'

const out = concat([new Uint8Array(header), new Uint8Array(jsonHeader), jsonChunk, new Uint8Array(binHeader), bin])
writeFileSync(new URL('../samples/knot.glb', import.meta.url), out)
console.log(`samples/knot.glb written (${out.byteLength} bytes, ${idxArr.length / 3} triangles)`)

// --- helpers --------------------------------------------------------------------
function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]] }
function add(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]] }
function scale(a, s) { return [a[0] * s, a[1] * s, a[2] * s] }
function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2] }
function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]] }
function norm(a) { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l] }
function align(n, a) { return Math.ceil(n / a) * a }
function pad(u8, alignment, filler) {
    const padded = align(u8.byteLength, alignment)
    const out = new Uint8Array(padded)
    out.set(u8)
    out.fill(filler, u8.byteLength)
    return out
}
function concat(parts) {
    const total = parts.reduce((s, p) => s + p.byteLength, 0)
    const out = new Uint8Array(total)
    let o = 0
    for (const p of parts) { out.set(p, o); o += p.byteLength }
    return out
}
function hsl(h, s, l) {
    const f = n => {
        const k = (n + h * 12) % 12
        return l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k - 3, 9 - k, 1))
    }
    return [f(0), f(8), f(4)]
}
