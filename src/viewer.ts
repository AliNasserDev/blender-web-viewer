import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'

export interface ModelStats {
    meshes: number
    triangles: number
    vertices: number
    materials: number
    textures: number
    lights: number
    animations: number
}

export type BackgroundPreset = 'dark' | 'light' | 'environment'

const BACKGROUNDS: Record<Exclude<BackgroundPreset, 'environment'>, THREE.Color> = {
    dark: new THREE.Color(0x17191d),
    light: new THREE.Color(0xe9eaec),
}

export class Viewer {
    readonly scene = new THREE.Scene()
    readonly camera: THREE.PerspectiveCamera
    readonly renderer: THREE.WebGLRenderer
    readonly controls: OrbitControls

    private readonly container: HTMLElement
    private readonly pmrem: THREE.PMREMGenerator
    private readonly envTexture: THREE.Texture
    private readonly keyLight: THREE.DirectionalLight
    private readonly fillLight: THREE.HemisphereLight
    private readonly grid: THREE.GridHelper
    private readonly ground: THREE.Mesh
    private readonly modelRoot = new THREE.Group()

    private mixer: THREE.AnimationMixer | null = null
    private actions: THREE.AnimationAction[] = []
    private playing = false
    private wireframe = false
    private modelLightsEnabled = true
    private importedLights: THREE.Light[] = []
    private frameRequest = 0
    private readonly clock = new THREE.Clock()

    onFrame?: (fps: number) => void
    onAnimationTick?: (time: number, duration: number) => void

    constructor(container: HTMLElement) {
        this.container = container

        this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping
        this.renderer.shadowMap.enabled = true
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
        container.appendChild(this.renderer.domElement)

        this.camera = new THREE.PerspectiveCamera(50, 1, 0.01, 2000)
        this.camera.position.set(4, 2.5, 5)

        this.controls = new OrbitControls(this.camera, this.renderer.domElement)
        this.controls.enableDamping = true
        this.controls.dampingFactor = 0.08
        this.controls.autoRotateSpeed = 1.2

        this.pmrem = new THREE.PMREMGenerator(this.renderer)
        this.envTexture = this.pmrem.fromScene(new RoomEnvironment(), 0.04).texture
        this.scene.environment = this.envTexture
        this.scene.background = BACKGROUNDS.dark.clone()

        this.keyLight = new THREE.DirectionalLight(0xffffff, 2.4)
        this.keyLight.position.set(4, 8, 5)
        this.keyLight.castShadow = true
        this.keyLight.shadow.mapSize.set(2048, 2048)
        this.keyLight.shadow.bias = -0.0004
        this.scene.add(this.keyLight)

        this.fillLight = new THREE.HemisphereLight(0xbfd4ff, 0x3a2f26, 0.5)
        this.scene.add(this.fillLight)

        this.grid = new THREE.GridHelper(10, 20, 0x555a63, 0x2c3037)
        ;(this.grid.material as THREE.Material).transparent = true
        ;(this.grid.material as THREE.Material).opacity = 0.85
        this.scene.add(this.grid)

        this.ground = new THREE.Mesh(
            new THREE.PlaneGeometry(1, 1),
            new THREE.ShadowMaterial({ opacity: 0.35 }),
        )
        this.ground.rotation.x = -Math.PI / 2
        this.ground.receiveShadow = true
        this.scene.add(this.ground)

        this.scene.add(this.modelRoot)

        const observer = new ResizeObserver(() => this.resize())
        observer.observe(container)
        this.resize()

        const tick = () => {
            this.frameRequest = requestAnimationFrame(tick)
            const dt = this.clock.getDelta()
            if (this.mixer && this.playing) {
                this.mixer.update(dt)
                this.emitAnimationTick()
            }
            this.controls.update()
            this.renderer.render(this.scene, this.camera)
            if (this.onFrame) this.onFrame(dt)
        }
        tick()
    }

    private resize() {
        const w = this.container.clientWidth || 1
        const h = this.container.clientHeight || 1
        this.camera.aspect = w / h
        this.camera.updateProjectionMatrix()
        this.renderer.setSize(w, h)
    }

    clearModel() {
        this.stopAnimations()
        this.mixer = null
        this.actions = []
        this.importedLights = []
        disposeObject(this.modelRoot)
        this.modelRoot.clear()
    }

    setModel(root: THREE.Object3D, animations: THREE.AnimationClip[] = []) {
        this.clearModel()
        this.modelRoot.add(root)

        // Collect lights that came with the model so they can be toggled.
        this.importedLights = []
        root.traverse(o => {
            if ((o as THREE.Light).isLight) {
                o.visible = this.modelLightsEnabled
                this.importedLights.push(o as THREE.Light)
            }
        })

        applyWireframe(root, this.wireframe)
        this.fitToScene()
        this.setupAnimations(animations)
    }

    fitToScene() {
        const box = new THREE.Box3().setFromObject(this.modelRoot, true)
        if (box.isEmpty()) return

        const size = box.getSize(new THREE.Vector3())
        const center = box.getCenter(new THREE.Vector3())
        const maxDim = Math.max(size.x, size.y, size.z) || 1

        this.camera.near = maxDim / 100
        this.camera.far = maxDim * 40
        this.camera.updateProjectionMatrix()

        const dist = maxDim * 1.9
        const dir = new THREE.Vector3(1, 0.62, 1).normalize()
        this.camera.position.copy(center).addScaledVector(dir, dist)
        this.controls.target.copy(center)
        this.controls.minDistance = maxDim * 0.05
        this.controls.maxDistance = maxDim * 30
        this.controls.update()

        // Fit ground/grid/shadows around the model.
        const pad = maxDim * 2
        this.keyLight.position.set(center.x + maxDim, center.y + maxDim * 2, center.z + maxDim)
        this.keyLight.target.position.copy(center)
        this.keyLight.target.updateMatrixWorld()
        const cam = this.keyLight.shadow.camera
        cam.left = -maxDim
        cam.right = maxDim
        cam.top = maxDim
        cam.bottom = -maxDim
        cam.near = maxDim * 0.5
        cam.far = maxDim * 6
        cam.updateProjectionMatrix()

        this.grid.scale.setScalar(pad / 5)
        this.grid.position.set(center.x, box.min.y, center.z)

        this.ground.scale.set(pad * 2, pad * 2, 1)
        this.ground.position.set(center.x, box.min.y - maxDim * 0.001, center.z)
    }

    frameObject(target: THREE.Object3D) {
        const box = new THREE.Box3().setFromObject(target, true)
        if (box.isEmpty()) return
        const center = box.getCenter(new THREE.Vector3())
        const size = box.getSize(new THREE.Vector3())
        const maxDim = Math.max(size.x, size.y, size.z) || 1
        const dir = this.camera.position.clone().sub(this.controls.target).normalize()
        this.camera.position.copy(center).addScaledVector(dir, maxDim * 2.2)
        this.controls.target.copy(center)
        this.controls.update()
    }

    private setupAnimations(clips: THREE.AnimationClip[]) {
        if (!clips.length) return
        this.mixer = new THREE.AnimationMixer(this.modelRoot)
        for (const clip of clips) {
            const action = this.mixer.clipAction(clip)
            action.play()
            this.actions.push(action)
        }
        this.playing = true
    }

    private emitAnimationTick() {
        if (!this.mixer || !this.onAnimationTick) return
        let duration = 0
        for (const a of this.actions) duration = Math.max(duration, a.getClip().duration)
        this.onAnimationTick(this.mixer.time % (duration || 1), duration)
    }

    get hasAnimations() { return !!this.mixer }
    get animationPlaying() { return this.playing }
    get animationDuration(): number {
        let d = 0
        for (const a of this.actions) d = Math.max(d, a.getClip().duration)
        return d
    }

    setAnimationPlaying(playing: boolean) {
        this.playing = playing
        for (const a of this.actions) a.paused = !playing
    }

    seekAnimation(time: number) {
        if (!this.mixer) return
        this.mixer.setTime(time)
        this.emitAnimationTick()
    }

    private stopAnimations() {
        this.playing = false
        if (this.mixer) this.mixer.stopAllAction()
    }

    setGridVisible(visible: boolean) {
        this.grid.visible = visible
        this.ground.visible = visible
    }

    setAutoRotate(enabled: boolean) {
        this.controls.autoRotate = enabled
    }

    setWireframe(enabled: boolean) {
        this.wireframe = enabled
        applyWireframe(this.modelRoot, enabled)
    }

    setBackground(preset: BackgroundPreset) {
        if (preset === 'environment') this.scene.background = this.envTexture
        else this.scene.background = BACKGROUNDS[preset].clone()
    }

    setModelLightsEnabled(enabled: boolean) {
        this.modelLightsEnabled = enabled
        for (const light of this.importedLights) light.visible = enabled
    }

    screenshot(): string {
        this.renderer.render(this.scene, this.camera)
        return this.renderer.domElement.toDataURL('image/png')
    }

    computeStats(): ModelStats {
        const stats: ModelStats = {
            meshes: 0, triangles: 0, vertices: 0,
            materials: 0, textures: 0, lights: 0,
            animations: this.actions.length,
        }
        const materials = new Set<THREE.Material>()
        const textures = new Set<THREE.Texture>()
        this.modelRoot.traverse(o => {
            const mesh = o as THREE.Mesh
            if (mesh.isMesh && mesh.geometry) {
                stats.meshes++
                const geo = mesh.geometry
                stats.vertices += geo.attributes.position?.count ?? 0
                if (geo.index) stats.triangles += geo.index.count / 3
                else if (geo.attributes.position) stats.triangles += geo.attributes.position.count / 3
                const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
                for (const m of mats) {
                    if (!m) continue
                    materials.add(m)
                    for (const value of Object.values(m)) {
                        if (value instanceof THREE.Texture) textures.add(value)
                    }
                }
            }
            if ((o as THREE.Light).isLight) stats.lights++
        })
        stats.materials = materials.size
        stats.textures = textures.size
        return stats
    }

    dispose() {
        cancelAnimationFrame(this.frameRequest)
        this.controls.dispose()
        disposeObject(this.modelRoot)
        this.pmrem.dispose()
        this.envTexture.dispose()
        this.renderer.dispose()
        this.renderer.domElement.remove()
    }
}

function applyWireframe(root: THREE.Object3D, enabled: boolean) {
    root.traverse(o => {
        const mesh = o as THREE.Mesh
        if (!mesh.isMesh) return
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
        for (const m of mats) {
            const std = m as THREE.MeshStandardMaterial
            if ('wireframe' in std) std.wireframe = enabled
        }
    })
}

function disposeObject(root: THREE.Object3D) {
    root.traverse(o => {
        const mesh = o as THREE.Mesh
        if (mesh.geometry) mesh.geometry.dispose()
        const mats = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : []
        for (const m of mats) {
            for (const value of Object.values(m)) {
                if (value instanceof THREE.Texture) value.dispose()
            }
            m.dispose()
        }
    })
}
