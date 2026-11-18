import { visualPixelRatioCap } from '@/lib/visualMotionPrefs'
import type { VisualPartPreview } from '@/services/garage/vehicleVisualPartPreview'
import type { VehicleVisualPayload } from '@/services/garage/vehicleVisualTypes'
import { recordVisualTelemetry } from '@/services/garage/visualTelemetry'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'

/**
 * Viewer 3D procedural leve (sem GLB). Lazy-imported.
 * Visual ≠ fato — só espelha payload + contagem G7.
 */
export function VehicleViewer3D({
  payload,
  modelParts,
  orphanInstallCount = 0,
  syncEnabled = false,
  reduceMotion = false,
}: {
  payload: VehicleVisualPayload
  modelParts: VisualPartPreview[]
  orphanInstallCount?: number
  syncEnabled?: boolean
  reduceMotion?: boolean
}) {
  const mountRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return
    const t0 = performance.now()

    const width = mount.clientWidth || 480
    const height = Math.max(220, Math.round(width * 0.45))

    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#eef2f6')

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100)
    camera.position.set(3.2, 1.6, 4.2)
    camera.lookAt(0, 0.4, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: !reduceMotion, alpha: false })
    renderer.setPixelRatio(visualPixelRatioCap(reduceMotion))
    renderer.setSize(width, height)
    mount.replaceChildren(renderer.domElement)

    const ambient = new THREE.AmbientLight(0xffffff, 0.7)
    scene.add(ambient)
    const dir = new THREE.DirectionalLight(0xffffff, 0.85)
    dir.position.set(4, 8, 3)
    scene.add(dir)

    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(3.2, 48),
      new THREE.MeshStandardMaterial({ color: 0xd5dde6, roughness: 1, metalness: 0 }),
    )
    ground.rotation.x = -Math.PI / 2
    ground.position.y = 0
    scene.add(ground)

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

    const glass = new THREE.Mesh(
      new THREE.BoxGeometry(1.05, 0.28, 0.88),
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(payload.accentHex),
        transparent: true,
        opacity: 0.45,
        metalness: 0.1,
        roughness: 0.2,
      }),
    )
    glass.position.set(-0.15, 0.9, 0)
    car.add(glass)

    const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.06, 1.12), accentMat)
    stripe.position.y = 0.28
    car.add(stripe)

    const wheelR =
      payload.wheelStyle === 'offroad' ? 0.28 : payload.wheelStyle === 'sport' ? 0.24 : 0.22
    const wheelGeo = new THREE.CylinderGeometry(wheelR, wheelR, 0.18, 20)
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 })
    const hubMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(payload.accentHex) })
    const wheelPositions: Array<[number, number, number]> = [
      [-0.75, wheelR, 0.55],
      [0.75, wheelR, 0.55],
      [-0.75, wheelR, -0.55],
      [0.75, wheelR, -0.55],
    ]
    for (const [x, y, z] of wheelPositions) {
      const w = new THREE.Mesh(wheelGeo, wheelMat)
      w.rotation.z = Math.PI / 2
      w.position.set(x, y, z)
      car.add(w)
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(wheelR * 0.35, wheelR * 0.35, 0.2, 12), hubMat)
      hub.rotation.z = Math.PI / 2
      hub.position.set(x, y, z)
      car.add(hub)
    }

    // Marcadores só com sync E4 (espelho 2A → modelo)
    const mirrored = syncEnabled && (modelParts.length > 0 || orphanInstallCount > 0)
    if (mirrored) {
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 12, 12),
        new THREE.MeshStandardMaterial({ color: 0x1b7a4a }),
      )
      m.position.set(1.1, 1.15, 0.45)
      car.add(m)
    }

    scene.add(car)

    let frame = 0
    let raf = 0
    const tick = () => {
      if (!reduceMotion) {
        frame += 1
        car.rotation.y = Math.sin(frame * 0.008) * 0.35 + 0.4
      }
      renderer.render(scene, camera)
      if (!reduceMotion) raf = requestAnimationFrame(tick)
    }
    tick()
    recordVisualTelemetry({
      source: 'procedural',
      outcome: 'ok',
      durationMs: Math.round(performance.now() - t0),
      reducedMotion: reduceMotion,
    })

    const onResize = () => {
      if (!mount) return
      const w = mount.clientWidth || width
      const h = Math.max(220, Math.round(w * 0.45))
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
      renderer.dispose()
      bodyMat.dispose()
      accentMat.dispose()
      wheelMat.dispose()
      hubMat.dispose()
      ground.geometry.dispose()
      ;(ground.material as THREE.Material).dispose()
      mount.replaceChildren()
    }
  }, [payload, modelParts, orphanInstallCount, syncEnabled, reduceMotion])

  const mirroredCount = modelParts.length + orphanInstallCount

  return (
    <div
      className="overflow-hidden rounded-fal border border-fal-line bg-fal-surface"
      role="img"
      aria-label="Visualização 3D procedural do veículo. Não é registro técnico."
    >
      <div ref={mountRef} className="w-full" />
      <p className="m-0 px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-fal-muted">
        Visual 3D leve · progressive enhancement · não é registro técnico
        {reduceMotion ? ' · movimento reduzido' : ''}
        {syncEnabled
          ? mirroredCount
            ? ` · sync 2A · ${mirroredCount} no modelo`
            : ' · sync 2A ligado'
          : ' · sync 2A desligado'}
      </p>
    </div>
  )
}

export default VehicleViewer3D
