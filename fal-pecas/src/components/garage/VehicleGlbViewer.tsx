import { visualPixelRatioCap } from '@/lib/visualMotionPrefs'
import type { VisualPartPreview } from '@/services/garage/vehicleVisualPartPreview'
import type { VehicleVisualAsset } from '@/services/garage/vehicleVisualAssetTypes'
import { signVisualAssetUrl } from '@/services/garage/vehicleVisualAssetService'
import type { VehicleVisualPayload } from '@/services/garage/vehicleVisualTypes'
import { recordVisualTelemetry } from '@/services/garage/visualTelemetry'
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

/**
 * Fase B E3 — loader GLB lazy (signed URL).
 * Falha → onError (Engine cai para procedural). Visual ≠ fato.
 */
export function VehicleGlbViewer({
  asset,
  payload,
  modelParts,
  orphanInstallCount = 0,
  syncEnabled = false,
  reduceMotion = false,
  onError,
}: {
  asset: VehicleVisualAsset
  payload: VehicleVisualPayload
  modelParts: VisualPartPreview[]
  orphanInstallCount?: number
  syncEnabled?: boolean
  reduceMotion?: boolean
  onError?: (reason: string) => void
}) {
  const mountRef = useRef<HTMLDivElement | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return
    const t0 = performance.now()

    let disposed = false
    let raf = 0
    let renderer: THREE.WebGLRenderer | null = null
    let camera: THREE.PerspectiveCamera | null = null
    let scene: THREE.Scene | null = null
    let root: THREE.Object3D | null = null

    const width = mount.clientWidth || 480
    const height = Math.max(240, Math.round(width * 0.45))

    void (async () => {
      try {
        const url = await signVisualAssetUrl(asset.storagePath, 180)
        if (!url) throw new Error('signed_url_missing')
        if (disposed) return

        scene = new THREE.Scene()
        scene.background = new THREE.Color('#eef2f6')

        camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 200)
        camera.position.set(3.4, 1.8, 4.4)

        renderer = new THREE.WebGLRenderer({ antialias: !reduceMotion })
        renderer.setPixelRatio(visualPixelRatioCap(reduceMotion))
        renderer.setSize(width, height)
        mount.replaceChildren(renderer.domElement)

        scene.add(new THREE.AmbientLight(0xffffff, 0.75))
        const dir = new THREE.DirectionalLight(0xffffff, 0.9)
        dir.position.set(5, 10, 4)
        scene.add(dir)

        const ground = new THREE.Mesh(
          new THREE.CircleGeometry(4, 48),
          new THREE.MeshStandardMaterial({ color: 0xd5dde6, roughness: 1 }),
        )
        ground.rotation.x = -Math.PI / 2
        scene.add(ground)

        const loader = new GLTFLoader()
        const gltfRoot = await new Promise<THREE.Group>((resolve, reject) => {
          loader.load(
            url,
            (g) => resolve(g.scene),
            undefined,
            (err) => reject(err instanceof Error ? err : new Error('glb_load_failed')),
          )
        })
        if (disposed) return

        root = gltfRoot
        const box = new THREE.Box3().setFromObject(root)
        const size = box.getSize(new THREE.Vector3())
        const maxDim = Math.max(size.x, size.y, size.z) || 1
        root.scale.setScalar(2.6 / maxDim)
        const center = new THREE.Box3().setFromObject(root).getCenter(new THREE.Vector3())
        root.position.sub(center)
        const grounded = new THREE.Box3().setFromObject(root)
        root.position.y -= grounded.min.y

        const body = new THREE.Color(payload.bodyColorHex)
        root.traverse((obj) => {
          const mesh = obj as THREE.Mesh
          if (!mesh.isMesh) return
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
          for (const m of mats) {
            if (!m || !('color' in m)) continue
            const sm = m as THREE.MeshStandardMaterial
            const c = sm.color
            if (c.r + c.g + c.b > 1.2) {
              sm.color.copy(body)
              if (payload.finish === 'metallic') {
                sm.metalness = Math.max(sm.metalness, 0.45)
                sm.roughness = Math.min(sm.roughness, 0.4)
              } else if (payload.finish === 'matte') {
                sm.metalness = 0.05
                sm.roughness = 0.9
              }
            }
          }
        })

        if (syncEnabled && (modelParts.length > 0 || orphanInstallCount > 0)) {
          const marker = new THREE.Mesh(
            new THREE.SphereGeometry(0.08, 12, 12),
            new THREE.MeshStandardMaterial({ color: 0x1b7a4a }),
          )
          marker.position.set(1.2, 1.2, 0.5)
          root.add(marker)
        }

        scene.add(root)
        camera.lookAt(0, 0.5, 0)

        let frame = 0
        const tick = () => {
          if (disposed || !renderer || !scene || !camera) return
          if (!reduceMotion) {
            frame += 1
            if (root) root.rotation.y = Math.sin(frame * 0.008) * 0.35 + 0.35
          }
          renderer.render(scene, camera)
          if (!reduceMotion) raf = requestAnimationFrame(tick)
        }
        tick()
        if (!disposed) {
          setStatus('ready')
          recordVisualTelemetry({
            source: 'glb',
            outcome: 'ok',
            assetCode: asset.code,
            durationMs: Math.round(performance.now() - t0),
            reducedMotion: reduceMotion,
          })
        }
      } catch (e) {
        if (disposed) return
        setStatus('error')
        const reason = e instanceof Error ? e.message : 'glb_error'
        recordVisualTelemetry({
          source: 'glb',
          outcome: 'error',
          assetCode: asset.code,
          durationMs: Math.round(performance.now() - t0),
          reason,
          reducedMotion: reduceMotion,
        })
        onError?.(reason)
      }
    })()

    const onResize = () => {
      if (!mount || !renderer || !camera) return
      const w = mount.clientWidth || width
      const h = Math.max(240, Math.round(w * 0.45))
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', onResize)

    return () => {
      disposed = true
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
      renderer?.dispose()
      mount.replaceChildren()
    }
  }, [asset, payload, modelParts, orphanInstallCount, syncEnabled, reduceMotion, onError])

  return (
    <div
      className="overflow-hidden rounded-fal border border-fal-line bg-fal-surface"
      role="img"
      aria-label={`Modelo 3D ${asset.displayName}. Não é registro técnico.`}
      aria-busy={status === 'loading'}
    >
      <div ref={mountRef} className="min-h-[220px] w-full" />
      <p className="m-0 px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-fal-muted">
        GLB · {asset.displayName} · {asset.code} · {status}
        {reduceMotion ? ' · movimento reduzido' : ''}
        {' · não é registro técnico'}
      </p>
    </div>
  )
}

export default VehicleGlbViewer
