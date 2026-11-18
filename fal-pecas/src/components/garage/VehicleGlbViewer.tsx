import { visualPixelRatioCap } from '@/lib/visualMotionPrefs'
import type { VisualPartPreview } from '@/services/garage/vehicleVisualPartPreview'
import type { VehicleVisualAsset } from '@/services/garage/vehicleVisualAssetTypes'
import { signVisualAssetUrl } from '@/services/garage/vehicleVisualAssetService'
import type { VehicleVisualPayload } from '@/services/garage/vehicleVisualTypes'
import { recordVisualTelemetry } from '@/services/garage/visualTelemetry'
import { useCallback, useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

export type GlbCameraPreset = 'front34' | 'front' | 'side' | 'rear34' | 'rear' | 'top' | 'reset'

const PRESET_POS: Record<Exclude<GlbCameraPreset, 'reset'>, [number, number, number]> = {
  front34: [3.4, 1.8, 4.4],
  front: [0, 1.4, 5.2],
  side: [5.2, 1.4, 0],
  rear34: [-3.2, 1.8, -4.2],
  rear: [0, 1.4, -5.2],
  top: [0.2, 7.2, 0.2],
}

/**
 * Consolida 3D v1 — GLB com órbita/zoom/presets.
 * Sem auto-rotação; sem recolor de pintura no GLB (Visual ≠ fato / decisão produto).
 */
export function VehicleGlbViewer({
  asset,
  payload: _payload,
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
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  const applyPreset = useCallback((preset: GlbCameraPreset) => {
    const camera = cameraRef.current
    const controls = controlsRef.current
    if (!camera || !controls) return
    const key = preset === 'reset' ? 'front34' : preset
    const pos = PRESET_POS[key]
    camera.position.set(pos[0], pos[1], pos[2])
    controls.target.set(0, 0.5, 0)
    controls.update()
  }, [])

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
    let controls: OrbitControls | null = null

    const width = mount.clientWidth || 480
    const height = Math.max(280, Math.round(width * 0.55))

    void (async () => {
      try {
        const url = await signVisualAssetUrl(asset.storagePath, 180)
        if (!url) throw new Error('signed_url_missing')
        if (disposed) return

        scene = new THREE.Scene()
        scene.background = new THREE.Color('#eef2f6')

        camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 200)
        camera.position.set(...PRESET_POS.front34)
        cameraRef.current = camera

        renderer = new THREE.WebGLRenderer({ antialias: !reduceMotion })
        renderer.setPixelRatio(visualPixelRatioCap(reduceMotion))
        renderer.setSize(width, height)
        const canvas = renderer.domElement
        canvas.style.touchAction = 'none'
        canvas.style.width = '100%'
        canvas.style.display = 'block'
        mount.replaceChildren(canvas)

        controls = new OrbitControls(camera, canvas)
        controls.enableDamping = !reduceMotion
        controls.dampingFactor = 0.08
        controls.minDistance = 2
        controls.maxDistance = 14
        controls.maxPolarAngle = Math.PI * 0.49
        controls.target.set(0, 0.5, 0)
        controls.update()
        controlsRef.current = controls

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

        // v1: não recolorir malha — pintura interativa no GLB fora de escopo.

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

        const tick = () => {
          if (disposed || !renderer || !scene || !camera) return
          controls?.update()
          renderer.render(scene, camera)
          raf = requestAnimationFrame(tick)
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
      const h = Math.max(280, Math.round(w * 0.55))
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', onResize)

    return () => {
      disposed = true
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
      controls?.dispose()
      controlsRef.current = null
      cameraRef.current = null
      renderer?.dispose()
      mount.replaceChildren()
    }
  }, [asset, modelParts, orphanInstallCount, syncEnabled, reduceMotion, onError])

  const presets: Array<{ id: GlbCameraPreset; label: string }> = [
    { id: 'reset', label: 'Reset' },
    { id: 'front34', label: '¾' },
    { id: 'front', label: 'Frente' },
    { id: 'side', label: 'Lado' },
    { id: 'rear34', label: '¾ trás' },
    { id: 'rear', label: 'Trás' },
    { id: 'top', label: 'Topo' },
  ]

  return (
    <div
      className="overflow-hidden rounded-fal border border-fal-line bg-fal-surface"
      role="img"
      aria-label={`Modelo 3D ${asset.displayName}. Arraste para girar, role para zoom. Não é registro técnico.`}
      aria-busy={status === 'loading'}
    >
      <div
        ref={mountRef}
        className="min-h-[280px] w-full touch-none"
        style={{ touchAction: 'none' }}
      />
      {status === 'ready' ? (
        <div
          className="flex flex-wrap gap-1 border-t border-fal-line px-2 py-2"
          role="group"
          aria-label="Ângulos predefinidos"
        >
          {presets.map((p) => (
            <button
              key={p.id}
              type="button"
              className="rounded-[8px] border border-fal-line bg-white px-2 py-1 text-[11px] font-bold text-fal-fg hover:border-fal-accent"
              onClick={() => applyPreset(p.id)}
            >
              {p.label}
            </button>
          ))}
        </div>
      ) : null}
      <p className="m-0 px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-fal-muted">
        GLB · {asset.displayName} · {asset.code} · {status}
        {status === 'loading' ? ' · carregando modelo 3D…' : ''}
        {status === 'ready' ? ' · órbita · zoom' : ''}
        {' · não é registro técnico'}
      </p>
    </div>
  )
}

export default VehicleGlbViewer
