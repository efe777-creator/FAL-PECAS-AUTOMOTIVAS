/**
 * Fase C C2 — sessão WebXR com cena procedural do veículo (Three.js).
 * Visual ≠ fato. Hit-test / peças = C3+.
 */

import type { VehicleVisualPayload } from '@/services/garage/vehicleVisualTypes'
import * as THREE from 'three'

export type VisualXrMode = 'immersive-ar' | 'immersive-vr'

export type VisualXrSessionHandle = {
  mode: VisualXrMode
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

  car.position.set(0, 0, -1.2)
  return car
}

/**
 * Inicia sessão imersiva e apresenta cena procedural até o usuário encerrar.
 * Caller deve manter referência e chamar `end()` no unmount se necessário.
 */
export async function startVisualXrImmersiveSession(opts: {
  mode: VisualXrMode
  payload: VehicleVisualPayload
  reduceMotion: boolean
}): Promise<VisualXrSessionHandle> {
  const blocked = visualXrSessionBlockedReason({
    reduceMotion: opts.reduceMotion,
    hasXrApi: typeof navigator !== 'undefined' && Boolean(navigator.xr),
  })
  if (blocked) throw new Error(blocked)
  if (!navigator.xr) throw new Error('no_xr_api')

  // C2: só features mínimas (hit-test = C3+). optional evita hard-fail em device fraco.
  const session = await navigator.xr.requestSession(opts.mode, {
    requiredFeatures: opts.mode === 'immersive-ar' ? ['local'] : ['local-floor'],
    optionalFeatures: ['local'],
  })

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

  const car = buildProceduralCarGroup(opts.payload)
  scene.add(car)

  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(2.5, 48),
    new THREE.MeshStandardMaterial({
      color: 0x8899aa,
      transparent: true,
      opacity: opts.mode === 'immersive-ar' ? 0.25 : 0.55,
      roughness: 1,
    }),
  )
  floor.rotation.x = -Math.PI / 2
  floor.position.y = -0.01
  scene.add(floor)

  let ended = false
  const cleanup = () => {
    if (ended) return
    ended = true
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

  let frame = 0
  renderer.setAnimationLoop(() => {
    frame += 1
    if (!opts.reduceMotion) {
      car.rotation.y = Math.sin(frame * 0.01) * 0.25
    }
    renderer.render(scene, camera)
  })

  return {
    mode: opts.mode,
    end: async () => {
      try {
        await session.end()
      } catch {
        /* já encerrada pelo device */
      }
      cleanup()
    },
  }
}
