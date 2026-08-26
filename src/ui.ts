import * as THREE from 'three'

export function el<T extends HTMLElement>(id: string): T {
    const node = document.getElementById(id)
    if (!node) throw new Error(`Missing #${id} in DOM`)
    return node as T
}

let toastTimer: number | undefined

export function toast(message: string, kind: 'info' | 'error' = 'info'): void {
    const container = el('toasts')
    const node = document.createElement('div')
    node.className = `toast toast-${kind}`
    node.textContent = message
    container.replaceChildren(node)
    window.clearTimeout(toastTimer)
    toastTimer = window.setTimeout(() => node.remove(), kind === 'error' ? 7000 : 3500)
}

export function setLoading(loading: boolean, label = 'Loading…'): void {
    const overlay = el('loading-overlay')
    overlay.classList.toggle('hidden', !loading)
    if (loading) (overlay.querySelector('.loading-label') as HTMLElement).textContent = label
}

export function formatInt(n: number): string {
    return n.toLocaleString('en-US', { maximumFractionDigits: 0 })
}

interface TreeCallbacks {
    onFocus: (object: THREE.Object3D) => void
}

export function renderTree(container: HTMLElement, root: THREE.Object3D, cb: TreeCallbacks): void {
    container.replaceChildren()
    if (!root.children.length) {
        container.innerHTML = '<div class="tree-empty">No model loaded</div>'
        return
    }
    for (const child of root.children) container.appendChild(buildNode(child, cb, true))
}

function buildNode(object: THREE.Object3D, cb: TreeCallbacks, expanded: boolean): HTMLLIElement {
    const li = document.createElement('li')
    const row = document.createElement('div')
    row.className = 'tree-row'

    const children = object.children.filter(c => !(c as THREE.Light).isLight || true)
    const hasKids = children.length > 0

    const toggle = document.createElement('span')
    toggle.className = 'tree-toggle'
    toggle.textContent = hasKids ? (expanded ? '▾' : '▸') : ''
    row.appendChild(toggle)

    const icon = document.createElement('span')
    icon.className = 'tree-icon'
    icon.textContent = iconFor(object)
    row.appendChild(icon)

    const label = document.createElement('span')
    label.className = 'tree-label'
    label.textContent = object.name || object.type.replace(/^(Mesh|Group|Object3D)$/, 'Object')
    label.title = `${object.name || object.type} — ${object.type}`
    row.appendChild(label)

    const typeBadge = document.createElement('span')
    typeBadge.className = 'tree-type'
    typeBadge.textContent = shortType(object)
    row.appendChild(typeBadge)

    row.addEventListener('click', e => {
        if (e.target === toggle && hasKids) {
            list.classList.toggle('collapsed')
            toggle.textContent = list.classList.contains('collapsed') ? '▸' : '▾'
            e.stopPropagation()
            return
        }
        cb.onFocus(object)
    })
    li.appendChild(row)

    const list = document.createElement('ul')
    if (!expanded) list.classList.add('collapsed')
    for (const child of children.slice(0, 400)) list.appendChild(buildNode(child, cb, false))
    li.appendChild(list)

    return li
}

function iconFor(object: THREE.Object3D): string {
    if ((object as THREE.Light).isLight) return '💡'
    if ((object as THREE.Camera).isCamera) return '🎥'
    const mesh = object as THREE.Mesh
    if (mesh.isMesh) return '◆'
    if (object instanceof THREE.Bone) return '🦴'
    if (object instanceof THREE.Group || object.children.length > 0) return '📁'
    return '·'
}

function shortType(object: THREE.Object3D): string {
    if ((object as THREE.Light).isLight) return 'light'
    if ((object as THREE.Camera).isCamera) return 'camera'
    if ((object as THREE.Mesh).isMesh) return 'mesh'
    if (object instanceof THREE.Bone) return 'bone'
    if ((object as THREE.SkinnedMesh).isSkinnedMesh) return 'skinned'
    return 'group'
}
