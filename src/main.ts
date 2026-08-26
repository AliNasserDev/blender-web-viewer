import * as THREE from 'three'
import './style.css'
import { Viewer } from './viewer'
import { loadFiles } from './load'
import { createSampleScene } from './samples'
import { el, toast, setLoading, renderTree, formatInt } from './ui'

const viewer = new Viewer(el('viewport'))
let modelRoot: THREE.Object3D | null = null

// --- status bar -----------------------------------------------------------
let fpsAccum = 0
let fpsFrames = 0
viewer.onFrame = dt => {
    fpsAccum += dt
    fpsFrames++
    if (fpsAccum >= 0.5) {
        el('status-fps').textContent = `${Math.round(fpsFrames / fpsAccum)} fps`
        fpsAccum = 0
        fpsFrames = 0
    }
}

function setFileInfo(name: string, format: string) {
    el('status-file').textContent = name || '—'
    el('status-format').textContent = format || ''
}

function updateStats() {
    const s = viewer.computeStats()
    const rows: Array<[string, string]> = [
        ['Meshes', formatInt(s.meshes)],
        ['Triangles', formatInt(s.triangles)],
        ['Vertices', formatInt(s.vertices)],
        ['Materials', formatInt(s.materials)],
        ['Textures', formatInt(s.textures)],
        ['Lights', formatInt(s.lights)],
        ['Animations', formatInt(s.animations)],
    ]
    el('stats-grid').replaceChildren(
        ...rows.map(([k, v]) => {
            const key = document.createElement('span')
            key.className = 'stat-key'
            key.textContent = k
            const val = document.createElement('span')
            val.className = 'stat-val'
            val.textContent = v
            const wrap = document.createElement('div')
            wrap.append(key, val)
            return wrap
        }),
    )
}

// --- model loading ----------------------------------------------------------
async function applyModel(root: THREE.Object3D, animations: THREE.AnimationClip[], name: string, format: string) {
    modelRoot = root
    viewer.setModel(root, animations)
    setFileInfo(name, format)
    updateStats()
    refreshTree()
    syncAnimUi()
}

async function handleFiles(fileList: FileList | File[]) {
    const files = [...fileList]
    if (!files.length) return
    setLoading(true, `Loading ${files[0].name}…`)
    await new Promise(r => setTimeout(r, 30)) // let the overlay paint before parsing
    try {
        const { root, animations, format } = await loadFiles(files)
        const name = files.length > 1 ? `${files[0].name} +${files.length - 1}` : files[0].name
        await applyModel(root, animations, name, format)
        toast(`Loaded ${name}`)
    } catch (err) {
        console.error(err)
        toast(err instanceof Error ? err.message : String(err), 'error')
    } finally {
        setLoading(false)
    }
}

function loadSample() {
    const { root, animations } = createSampleScene()
    void applyModel(root, animations, 'sample-scene (built-in)', 'SAMPLE')
}

function refreshTree() {
    renderTree(el('scene-tree'), modelRoot ?? new THREE.Object3D(), {
        onFocus: obj => viewer.frameObject(obj),
    })
}

// --- toolbar wiring -----------------------------------------------------------
function bindToggle(id: string, apply: (on: boolean) => void) {
    const checkbox = el<HTMLInputElement>(id)
    checkbox.addEventListener('change', () => apply(checkbox.checked))
}

bindToggle('toggle-grid', on => viewer.setGridVisible(on))
bindToggle('toggle-wireframe', on => viewer.setWireframe(on))
bindToggle('toggle-rotate', on => viewer.setAutoRotate(on))
bindToggle('toggle-model-lights', on => viewer.setModelLightsEnabled(on))

el<HTMLSelectElement>('select-background').addEventListener('change', e => {
    viewer.setBackground((e.target as HTMLSelectElement).value as never)
})

el('btn-open').addEventListener('click', () => el<HTMLInputElement>('file-input').click())
el<HTMLInputElement>('file-input').addEventListener('change', e => {
    handleFiles((e.target as HTMLInputElement).files ?? [])
    ;(e.target as HTMLInputElement).value = ''
})
el('btn-sample').addEventListener('click', loadSample)

el('btn-screenshot').addEventListener('click', () => {
    const a = document.createElement('a')
    a.href = viewer.screenshot()
    a.download = `viewer-${Date.now()}.png`
    a.click()
    toast('Screenshot saved')
})

el('btn-reset-view').addEventListener('click', () => viewer.fitToScene())

// --- animation controls ---------------------------------------------------------
function syncAnimUi() {
    const bar = el('anim-bar')
    bar.classList.toggle('hidden', !viewer.hasAnimations)
    if (!viewer.hasAnimations) return
    el<HTMLButtonElement>('anim-play').textContent = viewer.animationPlaying ? '❚❚' : '▶'
    el<HTMLInputElement>('anim-scrub').max = String(viewer.animationDuration || 1)
}

el('anim-play').addEventListener('click', () => {
    viewer.setAnimationPlaying(!viewer.animationPlaying)
    el<HTMLButtonElement>('anim-play').textContent = viewer.animationPlaying ? '❚❚' : '▶'
})
el('anim-scrub').addEventListener('input', e => {
    viewer.setAnimationPlaying(false)
    el<HTMLButtonElement>('anim-play').textContent = '▶'
    viewer.seekAnimation(Number((e.target as HTMLInputElement).value))
})
viewer.onAnimationTick = (time, duration) => {
    const slider = el<HTMLInputElement>('anim-scrub')
    if (document.activeElement !== slider) slider.value = String(Math.min(time, duration))
}

// --- drag & drop -------------------------------------------------------------------
const dropOverlay = el('drop-overlay')
let dragDepth = 0

window.addEventListener('dragenter', e => {
    e.preventDefault()
    dragDepth++
    dropOverlay.classList.remove('hidden')
})
window.addEventListener('dragleave', e => {
    e.preventDefault()
    if (--dragDepth <= 0) {
        dragDepth = 0
        dropOverlay.classList.add('hidden')
    }
})
window.addEventListener('dragover', e => e.preventDefault())
window.addEventListener('drop', e => {
    e.preventDefault()
    dragDepth = 0
    dropOverlay.classList.add('hidden')
    if (e.dataTransfer?.files.length) void handleFiles(e.dataTransfer.files)
})

// --- keyboard shortcuts ---------------------------------------------------------------
window.addEventListener('keydown', e => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return
    switch (e.key.toLowerCase()) {
        case 'f': case 'escape': viewer.fitToScene(); break
        case 'g': el<HTMLInputElement>('toggle-grid').click(); break
        case 'w': el<HTMLInputElement>('toggle-wireframe').click(); break
        case 'r': el<HTMLInputElement>('toggle-rotate').click(); break
    }
})

// --- boot --------------------------------------------------------------------------------
loadSample()
toast('Drop a .blend or mesh file anywhere — or press Open')
