import * as THREE from 'three'

export function createSampleScene(): { root: THREE.Object3D; animations: THREE.AnimationClip[] } {
    const root = new THREE.Group()
    root.name = 'Sample Scene'

    const knot = new THREE.Mesh(
        new THREE.TorusKnotGeometry(0.7, 0.24, 220, 36),
        new THREE.MeshPhysicalMaterial({
            name: 'BrushedSteel',
            color: 0xd8dadd,
            metalness: 0.95,
            roughness: 0.28,
        }),
    )
    knot.position.y = 1.35
    knot.name = 'TorusKnot'
    root.add(knot)

    const variants = [
        { color: 0xe4572e, roughness: 0.35, metalness: 0.0 },
        { color: 0x2e86ab, roughness: 0.15, metalness: 0.6 },
        { color: 0xf6ae2d, roughness: 0.8, metalness: 0.0 },
        { color: 0x57c785, roughness: 0.05, metalness: 0.9 },
    ]
    variants.forEach((v, i) => {
        const sphere = new THREE.Mesh(
            new THREE.SphereGeometry(0.34, 48, 32),
            new THREE.MeshStandardMaterial(v),
        )
        sphere.position.set(-1.5 + i * 1.0, 0.34, -0.9)
        sphere.name = `Sphere_${i + 1}`
        root.add(sphere)
    })

    const glass = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.42, 2),
        new THREE.MeshPhysicalMaterial({
            name: 'Glass',
            transmission: 0.92,
            thickness: 0.8,
            roughness: 0.06,
            ior: 1.45,
            transparent: true,
        }),
    )
    glass.position.set(1.55, 0.42, 0.75)
    glass.name = 'GlassGem'
    root.add(glass)

    const plinth = new THREE.Mesh(
        new THREE.CylinderGeometry(2.4, 2.6, 0.18, 64),
        new THREE.MeshStandardMaterial({ color: 0x30343b, roughness: 0.65, metalness: 0.25 }),
    )
    plinth.position.y = 0.09
    plinth.receiveShadow = true
    plinth.name = 'Plinth'
    root.add(plinth)

    return { root, animations: [] }
}
