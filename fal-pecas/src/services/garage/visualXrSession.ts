/**
 * Fase C C3–C4 — sessão WebXR: hit-test + GLB + marcadores + bridge SKU (sem checkout).
 * Visual ≠ fato. Sem write-back 2A.
 */

import type { VehicleVisualPayload } from '@/services/garage/vehicleVisualTypes'
import type { VisualXrCommercialPart } from '@/services/garage/visualXrCommercial'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

export type VisualXrMode = 'immersive-ar' | 'immersive-vr'

export type VisualXrSessionHandle = {
  mode: VisualXrMode
  usedHitTest: boolean
  usedGlb: boolean
  partMarkerCount: number
  commercialCount: number
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
export function attachXrPartMarkers(root: THREE.Object3D, count: number): THREE.Mesh[] {
  const n = Math.min(12, Math.max(0, count))
  const meshes: THREE.Mesh[] = []
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 10, 10),
      new THREE.MeshStandardMaterial({ color: 0x1b7a4a, emissive: 0x0a3d25, emissiveIntensity: 0.35 }),
    )
    const angle = (i / Math.max(1, n)) * Math.PI * 2
    m.position.set(Math.cos(angle) * 1.15, 1.05 + (i % 3) * 0.08, Math.sin(angle) * 0.55)
    m.name = `fal-xr-part-marker-${i}`
    root.add(m)
    meshes.push(m)
  }
  return meshes
}

/** Marcadores C4 com userData comercial (SKU/produto). */
export function attachXrCommercialMarkers(
  root: THREE.Object3D,
  parts: VisualXrCommercialPart[],
): THREE.Mesh[] {
  const meshes: THREE.Mesh[] = []
  const n = Math.min(12, parts.length)
  for (let i = 0; i < n; i++) {
    const part = parts[i]
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 12, 12),
      new THREE.MeshStandardMaterial({
        color: 0xf5c518,
        emissive: 0x7a5a00,
        emissiveIntensity: 0.25,
      }),
    )
    const angle = (i / Math.max(1, n)) * Math.PI * 2
    m.position.set(Math.cos(angle) * 1.2, 1.1 + (i % 3) * 0.1, Math.sin(angle) * 0.6)
    m.name = `fal-xr-sku-marker-${i}`
    m.userData.falCommercial = part
    root.add(m)
    meshes.push(m)
  }
  return meshes
}

function buildXrCommercialHud(opts: {
  parts: VisualXrCommercialPart[]
  onInterest: (part: VisualXrCommercialPart) => void
  onOpenProduct: (productId: string) => void
  onExitToCart?: (productId: string) => void
}): HTMLDivElement {
  const hud = document.createElement('div')
  hud.id = 'fal-xr-commercial-hud'
  hud.setAttribute('aria-label', 'Peças FAL na sessão XR')
  hud.style.cssText =
    'position:fixed;left:12px;right:12px;bottom:12px;z-index:10000;max-height:42vh;overflow:auto;' +
    'background:rgba(10,18,28,.92);color:#f4f7fb;border:1px solid rgba(245,197,24,.45);' +
    'border-radius:12px;padding:10px 12px;font:600 12px/1.35 system-ui,sans-serif;'
  const title = document.createElement('p')
  title.style.cssText = 'margin:0 0 8px;font-weight:800;font-size:13px'
  title.textContent = 'Peças (espelho visual) · C5: carrinho na web · sem pagamento na XR'
  hud.appendChild(title)

  for (const part of opts.parts) {
    const row = document.createElement('div')
    row.style.cssText =
      'display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between;' +
      'padding:6px 0;border-top:1px solid rgba(255,255,255,.08)'
    const label = document.createElement('button')
    label.type = 'button'
    label.style.cssText =
      'flex:1;min-width:140px;text-align:left;background:transparent;border:0;color:inherit;cursor:pointer;padding:0'
    label.textContent = `${part.name}${part.sku ? ` · ${part.sku}` : ''} · ${part.state}`
    label.addEventListener('click', () => opts.onInterest(part))
    row.appendChild(label)
    if (part.productId) {
      const actions = document.createElement('div')
      actions.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap'
      const openBtn = document.createElement('button')
      openBtn.type = 'button'
      openBtn.textContent = 'Ver ficha'
      openBtn.style.cssText =
        'border:1px solid #f5c518;background:transparent;color:#f5c518;border-radius:8px;' +
        'padding:4px 8px;font-weight:800;cursor:pointer'
      openBtn.addEventListener('click', () => {
        if (part.productId) opts.onOpenProduct(part.productId)
      })
      actions.appendChild(openBtn)
      if (opts.onExitToCart) {
        const cartBtn = document.createElement('button')
        cartBtn.type = 'button'
        cartBtn.textContent = 'Carrinho'
        cartBtn.style.cssText =
          'border:1px solid #f5c518;background:#f5c518;color:#0a121c;border-radius:8px;' +
          'padding:4px 8px;font-weight:800;cursor:pointer'
        cartBtn.addEventListener('click', () => {
          if (part.productId) opts.onExitToCart?.(part.productId)
        })
        actions.appendChild(cartBtn)
      }
      row.appendChild(actions)
    }
    hud.appendChild(row)
  }
  return hud
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
 * Sessão imersiva C3–C4: procedural/GLB, hit-test AR, bridge SKU (sem checkout).
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
  /** C4: peças com SKU/produto para HUD. */
  commercialParts?: VisualXrCommercialPart[]
  onCommercialInterest?: (part: VisualXrCommercialPart) => void
  /** C4: encerra XR e navega à ficha. */
  onOpenProduct?: (productId: string) => void
  /** C5: encerra XR, addItem + `/carrinho` — nunca pagamento in-XR. */
  onExitToCart?: (productId: string) => void
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

  const commercialParts = opts.commercialParts ?? []
  const commercialCount = commercialParts.length
  let markerMeshes: THREE.Mesh[] = []
  if (commercialCount > 0) {
    markerMeshes = attachXrCommercialMarkers(vehicleRoot, commercialParts)
  } else {
    const markerCount = partMarkerCountForXr({
      syncEnabled: Boolean(opts.syncEnabled),
      modelPartCount: opts.modelPartCount ?? 0,
      orphanCount: opts.orphanCount ?? 0,
    })
    markerMeshes = attachXrPartMarkers(vehicleRoot, markerCount)
  }
  const partMarkerCount = markerMeshes.length

  const highlightPart = (key: string) => {
    for (const mesh of markerMeshes) {
      const mat = mesh.material as THREE.MeshStandardMaterial
      const data = mesh.userData.falCommercial as VisualXrCommercialPart | undefined
      const active = data?.key === key
      mat.emissiveIntensity = active ? 0.85 : 0.25
      mat.color.set(active ? 0xffffff : commercialCount ? 0xf5c518 : 0x1b7a4a)
    }
  }

  let hud: HTMLDivElement | null = null
  if (commercialCount > 0) {
    hud = buildXrCommercialHud({
      parts: commercialParts,
      onInterest: (part) => {
        highlightPart(part.key)
        opts.onCommercialInterest?.(part)
      },
      onOpenProduct: (productId) => {
        opts.onOpenProduct?.(productId)
      },
      onExitToCart: opts.onExitToCart
        ? (productId) => {
            opts.onExitToCart?.(productId)
          }
        : undefined,
    })
    document.body.appendChild(hud)
  }

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
      hitTestSource =
        (await (
          session as XRSession & {
            requestHitTestSource: (o: { space: XRReferenceSpace }) => Promise<XRHitTestSource>
          }
        ).requestHitTestSource({ space: viewerSpace })) ?? null
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
    if (hud?.parentNode) hud.parentNode.removeChild(hud)
    hud = null
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
    commercialCount,
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
