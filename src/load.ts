import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js'
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js'
import { STLLoader } from 'three/addons/loaders/STLLoader.js'
import { PLYLoader } from 'three/addons/loaders/PLYLoader.js'
import { ColladaLoader } from 'three/addons/loaders/ColladaLoader.js'
import { parseBlend, createObjects } from './blend/index.js'

export interface LoadResult {
    root: THREE.Object3D
    animations: THREE.AnimationClip[]
}

type LoaderFactory = (url: string, manager: THREE.LoadingManager) => Promise<LoadResult>

function normalize(root: THREE.Object3D): void {
    root.traverse(o => {
        const mesh = o as THREE.Mesh
        if (mesh.isMesh && mesh.geometry) {
            if (!mesh.geometry.attributes.normal) mesh.geometry.computeVertexNormals()
            if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox()
            mesh.castShadow = true
            mesh.receiveShadow = true
            const mat = mesh.material as THREE.MeshStandardMaterial
            if (mat && mat.vertexColors === false && mesh.geometry.attributes.color) {
                mat.vertexColors = true
                mat.needsUpdate = true
            }
        }
    })
}

async function fromGltf(url: string, manager: THREE.LoadingManager): Promise<LoadResult> {
    const res = await new GLTFLoader(manager).loadAsync(url)
    normalize(res.scene)
    return { root: res.scene, animations: res.animations ?? [] }
}

async function fromObj(url: string, _manager: THREE.LoadingManager): Promise<LoadResult> {
    const root = await new OBJLoader().loadAsync(url)
    normalize(root)
    return { root, animations: [] }
}

async function fromFbx(url: string, _manager: THREE.LoadingManager): Promise<LoadResult> {
    const root = await new FBXLoader().loadAsync(url)
    normalize(root)
    return { root, animations: root.animations ?? [] }
}

async function fromStl(url: string, _manager: THREE.LoadingManager): Promise<LoadResult> {
    const geo = await new STLLoader().loadAsync(url)
    const mesh = new THREE.Mesh(
        geo,
        new THREE.MeshStandardMaterial({ color: 0xb8bcc4, roughness: 0.45, metalness: 0.15 }),
    )
    return { root: new THREE.Group().add(mesh), animations: [] }
}

async function fromPly(url: string, _manager: THREE.LoadingManager): Promise<LoadResult> {
    const geo = await new PLYLoader().loadAsync(url)
    if (!geo.attributes.normal) geo.computeVertexNormals()
    const mesh = new THREE.Mesh(
        geo,
        new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.5,
            metalness: 0.1,
            vertexColors: !!geo.attributes.color,
        }),
    )
    return { root: new THREE.Group().add(mesh), animations: [] }
}

async function fromDae(url: string, _manager: THREE.LoadingManager): Promise<LoadResult> {
    const collada = await new ColladaLoader().loadAsync(url)
    if (!collada?.scene) throw new Error('Empty Collada document')
    normalize(collada.scene)
    return { root: collada.scene, animations: collada.scene.animations ?? [] }
}

async function fromBlend(buffer: ArrayBuffer, name: string): Promise<LoadResult> {
    const file = await parseBlend(buffer, name)
    const objects = createObjects(file)
    if (!objects.length) throw new Error('No supported objects found in .blend file')
    const root = new THREE.Group()
    root.name = name
    root.add(...objects)
    return { root, animations: [] }
}

const LOADERS: Record<string, LoaderFactory> = {
    gltf: fromGltf,
    glb: fromGltf,
    obj: fromObj,
    fbx: fromFbx,
    stl: fromStl,
    ply: fromPly,
    dae: fromDae,
}

const BLEND_TYPES = new Set(['blend'])

/**
 * Load the given files as one model. Extra files (textures, .bin, .mtl)
 * are resolved relative to the primary file via blob URLs.
 */
export async function loadFiles(files: File[]): Promise<LoadResult & { format: string }> {
    const known = files.filter(f => {
        const ext = extOf(f.name)
        return BLEND_TYPES.has(ext) || !!LOADERS[ext]
    })
    if (!known.length) {
        throw new Error('Unsupported file type. Supported: .blend, .glb, .gltf, .obj, .fbx, .stl, .ply, .dae')
    }
    const primary = known[0]
    const ext = extOf(primary.name)

    const blobUrls = new Map<string, string>()
    for (const f of files) blobUrls.set(f.name.toLowerCase(), URL.createObjectURL(f))

    const manager = new THREE.LoadingManager()
    manager.setURLModifier(url => {
        if (url.startsWith('blob:') || url.startsWith('data:')) return url
        const base = decodeURIComponent(url).split(/[\\/]/).pop()?.toLowerCase() ?? ''
        return blobUrls.get(base) ?? url
    })

    try {
        let result: LoadResult
        if (BLEND_TYPES.has(ext)) {
            result = await fromBlend(await primary.arrayBuffer(), stripExt(primary.name))
        } else {
            const factory = LOADERS[ext]
            result = await factory(URL.createObjectURL(primary), manager)
        }
        return { ...result, format: ext.toUpperCase() }
    } finally {
        // Give pending loads a beat to consume their blobs before revoking.
        setTimeout(() => {
            for (const u of blobUrls.values()) URL.revokeObjectURL(u)
        }, 10_000)
    }
}

export function extOf(name: string): string {
    const i = name.lastIndexOf('.')
    return i >= 0 ? name.slice(i + 1).toLowerCase() : ''
}

function stripExt(name: string): string {
    const i = name.lastIndexOf('.')
    return i > 0 ? name.slice(0, i) : name
}
