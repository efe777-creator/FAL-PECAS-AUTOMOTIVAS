/**
 * Fase C C3 — sessão WebXR: hit-test AR + GLB opcional + marcadores de peça.
 * Visual ≠ fato. Sem write-back 2A.
 */

import type { VehicleVisualPayload } from '@/services/garage/vehicleVisualTypes'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

export type VisualXrMode = 'immersive-ar' | 'immersive-vr'

export type VisualXrSessionHandle = {
  mode: VisualXrMode
  usedHitTest: boolean
  usedGlb: boolean
  partMarkerCount: number
  end: () => Promise<void>
}

export function visualXrSessionBlockedReason(input: {
  reduceMotion: boolean
  hasXrApi: boolean
}): string | null {
  if (input.reduceMotion) return 'reduced_motion'
  if (!input.hasXrApi) return 'no_xr_api'
  return null
}

/** Features da sessão: hit-test só em AR (optional → não quebra device sem suporte). */
export function resolveXrSessionInit(mode: VisualXrMode): XRSessionInit {
  if (mode === 'immersive-ar') {
    return {
      requiredFeatures: ['local'],
      optionalFeatures: ['hit-test', 'local-floor'],
    }
  }
  return {
    requiredFeatures: ['local-floor'],
    optionalFeatures: ['local'],
  }
}

export function partMarkerCountForXr(input: {
  syncEnabled: boolean
  modelPartCount: number
  orphanCount: number
}): number {
  if (!input.syncEnabled) return 0
  return Math.min(12, Math.max(0, input.modelPartCount + input.orphanCount))
}

export function buildProceduralCarGroup(payload: VehicleVisualPayload): THREE.Group {
  const car = new THREE.Group()
  const bodyMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(payload.bodyColorHex),
    metalness: payload.finish === 'metallic' ? 0.55 : 0.08,
    roughness: payload.finish === 'matte' ? 0.92 : payload.finish === 'metallic' ? 0.35 : 0.55,
  })
  const accentMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(payload.accentHex),
    metalness: 0.2,
    roughness: 0.5,
  })

  const body = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.45, 1.1), bodyMat)
  body.position.y = 0.45
  car.add(body)

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.4, 0.95), bodyMat)
  cabin.position.set(-0.15, 0.85, 0)
  car.add(cabin)

  const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.06, 1.12), accentMat)
  stripe.position.y = 0.28
  car.add(stripe)

  const wheelR =
    payload.wheelStyle === 'offroad' ? 0.28 : payload.wheelStyle === 'sport' ? 0.24 : 0.22
  const wheelGeo = new THREE.CylinderGeometry(wheelR, wheelR, 0.18, 16)
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 })
  const positions: Array<[number, number, number]> = [
    [-0.75, wheelR, 0.55],
    [0.75, wheelR, 0.55],
    [-0.75, wheelR, -0.55],
    [0.75, wheelR, -0.55],
  ]
  for (const [x, y, z] of positions) {
    const w = new THREE.Mesh(wheelGeo, wheelMat)
    w.rotation.z = Math.PI / 2
    w.position.set(x, y, z)
    car.add(w)
  }

  return car
}

/** Esferas verdes = espelho visual de peças/sync (não é instalação física). */
export function attachXrPartMarkers(root: THREE.Object3D, count: number): number {
  const n = Math.min(12, Math.max(0, count))
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 10, 10),
      new THREE.MeshStandardMaterial({ color: 0x1b7a4a, emissive: 0x0a3d25, emissiveIntensity: 0.35 }),
    )
    const angle = (i / Math.max(1, n)) * Math.PI * 2
    m.position.set(Math.cos(angle) * 1.15, 1.05 + (i % 3) * 0.08, Math.sin(angle) * 0.55)
    m.name = `fal-xr-part-marker-${i}`
    root.add(m)
  }
  return n
}

async function loadGlbRoot(url: string): Promise<THREE.Object3D> {
  const loader = new GLTFLoader()
  const gltf = await loader.loadAsync(url)
  const root = gltf.scene
  const box = new THREE.Box3().setFromObject(root)
  const size = box.getSize(new THREE.Vector3())
  const maxDim = Math.max(size.x, size.y, size.z) || 1
  root.scale.setScalar(2.4 / maxDim)
  const center = new THREE.Box3().setFromObject(root).getCenter(new THREE.Vector3())
  root.position.sub(center)
  const grounded = new THREE.Box3().setFromObject(root)
  root.position.y -= grounded.min.y
  return root
}

/**
 * Sessão imersiva C3: procedural ou GLB; AR com hit-test quando disponível.
 */
export async function startVisualXrImmersiveSession(opts: {
  mode: VisualXrMode
  payload: VehicleVisualPayload
  reduceMotion: boolean
  /** Signed URL GLB (opcional). Falha de load → procedural. */
  glbUrl?: string | null
  syncEnabled?: boolean
  modelPartCount?: number
  orphanCount?: number
}): Promise<VisualXrSessionHandle> {
  const blocked = visualXrSessionBlockedReason({
    reduceMotion: opts.reduceMotion,
    hasXrApi: typeof navigator !== 'undefined' && Boolean(navigator.xr),
  })
  if (blocked) throw new Error(blocked)
  if (!navigator.xr) throw new Error('no_xr_api')

  const session = await navigator.xr.requestSession(opts.mode, resolveXrSessionInit(opts.mode))

  const scene = new THREE.Scene()
  if (opts.mode === 'immersive-vr') {
    scene.background = new THREE.Color('#101820')
  }

  const camera = new THREE.PerspectiveCamera(70, 1, 0.01, 50)
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.xr.enabled = true
  renderer.setSize(window.innerWidth, window.innerHeight)
  document.body.appendChild(renderer.domElement)
  renderer.domElement.style.cssText =
    'position:fixed;inset:0;z-index:9999;width:100%;height:100%;touch-action:none'

  scene.add(new THREE.AmbientLight(0xffffff, 0.85))
  const dir = new THREE.DirectionalLight(0xffffff, 0.95)
  dir.position.set(2, 4, 1)
  scene.add(dir)

  const vehicleRoot = new THREE.Group()
  vehicleRoot.name = 'fal-xr-vehicle-root'
  scene.add(vehicleRoot)

  let usedGlb = false
  if (opts.glbUrl) {
    try {
      const glb = await loadGlbRoot(opts.glbUrl)
      vehicleRoot.add(glb)
      usedGlb = true
    } catch {
      vehicleRoot.add(buildProceduralCarGroup(opts.payload))
    }
  } else {
    vehicleRoot.add(buildProceduralCarGroup(opts.payload))
  }

  const markerCount = partMarkerCountForXr({
    syncEnabled: Boolean(opts.syncEnabled),
    modelPartCount: opts.modelPartCount ?? 0,
    orphanCount: opts.orphanCount ?? 0,
  })
  const partMarkerCount = attachXrPartMarkers(vehicleRoot, markerCount)

  const reticle = new THREE.Mesh(
    new THREE.RingGeometry(0.12, 0.15, 32).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0xf5c518 }),
  )
  reticle.matrixAutoUpdate = false
  reticle.visible = false
  scene.add(reticle)

  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(2.5, 48),
    new THREE.MeshStandardMaterial({
      color: 0x8899aa,
      transparent: true,
      opacity: opts.mode === 'immersive-ar' ? 0.2 : 0.55,
      roughness: 1,
    }),
  )
  floor.rotation.x = -Math.PI / 2
  floor.position.y = -0.01
  // VR: veículo já posicionado; AR: esconde até hit
  if (opts.mode === 'immersive-vr') {
    vehicleRoot.position.set(0, 0, -1.4)
    scene.add(floor)
    floor.position.copy(vehicleRoot.position)
    floor.position.y = -0.01
  } else {
    vehicleRoot.visible = false
  }

  let hitTestSource: XRHitTestSource | null = null
  let usedHitTest = false
  let placed = opts.mode === 'immersive-vr'

  try {
    if (opts.mode === 'immersive-ar' && 'requestHitTestSource' in session) {
      const viewerSpace = await session.requestReferenceSpace('viewer')
      hitTestSource = await (
        session as XRSession & {
          requestHitTestSource: (o: { space: XRReferenceSpace }) => Promise<XRHitTestSource>
        }
      ).requestHitTestSource({ space: viewerSpace })
      usedHitTest = Boolean(hitTestSource)
    }
  } catch {
    usedHitTest = false
    hitTestSource = null
    // Sem hit-test: posiciona à frente
    vehicleRoot.visible = true
    vehicleRoot.position.set(0, 0, -1.4)
    placed = true
  }

  if (opts.mode === 'immersive-ar' && !hitTestSource) {
    vehicleRoot.visible = true
    vehicleRoot.position.set(0, 0, -1.4)
    placed = true
  }

  const placeFromHitMatrix = (matrix: Float32Array | THREE.Matrix4) => {
    const m = matrix instanceof THREE.Matrix4 ? matrix : new THREE.Matrix4().fromArray(matrix)
    vehicleRoot.visible = true
    vehicleRoot.matrixAutoUpdate = true
    const pos = new THREE.Vector3()
    const quat = new THREE.Quaternion()
    const scl = new THREE.Vector3()
    m.decompose(pos, quat, scl)
    vehicleRoot.position.copy(pos)
    vehicleRoot.quaternion.copy(quat)
    placed = true
    reticle.visible = false
  }

  const onSelect = () => {
    if (!reticle.visible) return
    placeFromHitMatrix(reticle.matrix)
  }
  session.addEventListener('select', onSelect)

  let ended = false
  const cleanup = () => {
    if (ended) return
    ended = true
    session.removeEventListener('select', onSelect)
    try {
      hitTestSource?.cancel()
    } catch {
      /* ignore */
    }
    hitTestSource = null
    renderer.setAnimationLoop(null)
    try {
      renderer.dispose()
    } catch {
      /* ignore */
    }
    if (renderer.domElement.parentNode) {
      renderer.domElement.parentNode.removeChild(renderer.domElement)
    }
    scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (mesh.geometry) mesh.geometry.dispose()
      const mat = mesh.material
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose())
      else if (mat) (mat as THREE.Material).dispose()
    })
  }

  session.addEventListener('end', cleanup)
  await renderer.xr.setSession(session)

  let frameN = 0
  renderer.setAnimationLoop((_time, frame) => {
    frameN += 1
    if (!opts.reduceMotion && placed) {
      vehicleRoot.rotation.y = Math.sin(frameN * 0.008) * 0.2
    }

    if (frame && hitTestSource && !placed) {
      const refSpace = renderer.xr.getReferenceSpace()
      if (refSpace) {
        const hits = frame.getHitTestResults(hitTestSource)
        if (hits.length > 0) {
          const pose = hits[0].getPose(refSpace)
          if (pose) {
            reticle.visible = true
            reticle.matrix.fromArray(pose.transform.matrix)
          }
        } else {
          reticle.visible = false
        }
      }
    }

    renderer.render(scene, camera)
  })

  return {
    mode: opts.mode,
    usedHitTest,
    usedGlb,
    partMarkerCount,
    end: async () => {
      try {
        await session.end()
      } catch {
        /* já encerrada */
      }
      cleanup()
    },
  }
}
