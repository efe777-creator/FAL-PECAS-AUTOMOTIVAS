import { VehicleSilhouette2D } from '@/components/garage/VehicleSilhouette2D'
import { VehicleXrLauncher } from '@/components/garage/VehicleXrLauncher'
import { prefersReducedMotion } from '@/lib/visualMotionPrefs'
import {
  detectWebXrSupport,
  isVisualXrEnabled,
} from '@/lib/visualXrGate'
import type { VisualPartPreview } from '@/services/garage/vehicleVisualPartPreview'
import type { VehicleVisualAsset } from '@/services/garage/vehicleVisualAssetTypes'
import type { VehicleVisualPayload } from '@/services/garage/vehicleVisualTypes'
import {
  effectiveRenderSource,
  resolveVisualizationSource,
  visualizationSourceLabel,
  type VisualizationSource,
} from '@/services/garage/visualizationEngine'
import { recordVisualTelemetry } from '@/services/garage/visualTelemetry'
import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'

const VehicleViewer3D = lazy(() => import('./VehicleViewer3D'))
const VehicleGlbViewer = lazy(() => import('./VehicleGlbViewer'))

/**
 * FAL Vehicle Visualization Engine (Fase B E5 + Fase C C1).
 * Adapters: 2d | procedural | glb | xr (gate + launcher). Visual ≠ fato.
 */
export function VehicleVisualizationEngine({
  payload,
  modelParts,
  orphanInstallCount,
  syncEnabled,
  preferredMode,
  webglOk,
  hasApprovedGlb = false,
  approvedAsset = null,
}: {
  payload: VehicleVisualPayload
  modelParts: VisualPartPreview[]
  orphanInstallCount: number
  syncEnabled: boolean
  preferredMode: 'auto' | '2d' | '3d'
  webglOk: boolean
  hasApprovedGlb?: boolean
  approvedAsset?: VehicleVisualAsset | null
}) {
  const [glbLoadFailed, setGlbLoadFailed] = useState(false)
  const [reduceMotion, setReduceMotion] = useState(false)
  const [xrGateOn, setXrGateOn] = useState(false)
  const [xrSupported, setXrSupported] = useState(false)
  const [xrMode, setXrMode] = useState<'immersive-ar' | 'immersive-vr' | null>(null)
  const [xrUserFallback, setXrUserFallback] = useState(false)
  const assetKey = approvedAsset?.id ?? ''

  useEffect(() => {
    setReduceMotion(prefersReducedMotion())
    setXrGateOn(isVisualXrEnabled())
  }, [])

  useEffect(() => {
    if (!xrGateOn || reduceMotion) {
      setXrSupported(false)
      setXrMode(null)
      return
    }
    let cancelled = false
    void detectWebXrSupport().then((r) => {
      if (cancelled) return
      setXrSupported(r.supported)
      setXrMode(r.mode)
    })
    return () => {
      cancelled = true
    }
  }, [xrGateOn, reduceMotion])

  const onGlbError = useCallback(
    (reason: string) => {
      setGlbLoadFailed(true)
      recordVisualTelemetry({
        source: 'glb',
        outcome: 'fallback',
        assetCode: approvedAsset?.code,
        reason,
        reducedMotion: reduceMotion,
      })
    },
    [approvedAsset?.code, reduceMotion],
  )

  useEffect(() => {
    setGlbLoadFailed(false)
  }, [assetKey])

  const resolved: VisualizationSource = useMemo(
    () =>
      resolveVisualizationSource({
        preferredMode,
        webglOk,
        hasApprovedGlb: hasApprovedGlb && Boolean(approvedAsset),
        xrEnabled: xrGateOn && !xrUserFallback,
        xrSupported,
        reducedMotion: reduceMotion,
      }),
    [
      preferredMode,
      webglOk,
      hasApprovedGlb,
      approvedAsset,
      reduceMotion,
      xrGateOn,
      xrSupported,
      xrUserFallback,
    ],
  )

  const renderSource = useMemo(
    () =>
      effectiveRenderSource(resolved, webglOk, {
        glbLoadFailed,
        hasApprovedGlb: hasApprovedGlb && Boolean(approvedAsset),
      }),
    [resolved, webglOk, glbLoadFailed, hasApprovedGlb, approvedAsset],
  )

  useEffect(() => {
    if (resolved === 'xr') {
      recordVisualTelemetry({
        source: 'xr',
        outcome: 'ok',
        reason: xrMode ?? 'xr_shell',
        reducedMotion: reduceMotion,
      })
      return
    }
    if (renderSource === '2d') {
      recordVisualTelemetry({
        source: '2d',
        outcome: !webglOk || preferredMode === '2d' || reduceMotion ? 'ok' : 'fallback',
        reason: !webglOk ? 'no_webgl' : reduceMotion ? 'reduced_motion' : preferredMode,
        reducedMotion: reduceMotion,
      })
    }
  }, [resolved, renderSource, webglOk, preferredMode, reduceMotion, xrMode])

  const fallback2d = (
    <VehicleSilhouette2D
      payload={payload}
      modelParts={modelParts}
      orphanInstallCount={orphanInstallCount}
      syncEnabled={syncEnabled}
    />
  )

  const procedural = (
    <Suspense fallback={fallback2d}>
      <VehicleViewer3D
        payload={payload}
        modelParts={modelParts}
        orphanInstallCount={orphanInstallCount}
        syncEnabled={syncEnabled}
        reduceMotion={reduceMotion}
      />
    </Suspense>
  )

  const canvas =
    renderSource === 'glb' && approvedAsset ? (
      <Suspense fallback={procedural}>
        <VehicleGlbViewer
          asset={approvedAsset}
          payload={payload}
          modelParts={modelParts}
          orphanInstallCount={orphanInstallCount}
          syncEnabled={syncEnabled}
          reduceMotion={reduceMotion}
          onError={onGlbError}
        />
      </Suspense>
    ) : renderSource === 'procedural' ? (
      procedural
    ) : (
      fallback2d
    )

  const glbIsPlaceholder =
    Boolean(approvedAsset) &&
    (/smoke|placeholder|provis[oó]rio/i.test(approvedAsset!.code) ||
      /não é modelo real|smoke|placeholder|provis[oó]rio/i.test(approvedAsset!.displayName))
  const showProvisionalBadge = renderSource === 'procedural' || (renderSource === 'glb' && glbIsPlaceholder)

  return (
    <section className="space-y-2" aria-label="Visualização do veículo">
      <div className="relative" aria-describedby="fal-visual-engine-status">
        {showProvisionalBadge ? (
          <p className="pointer-events-none absolute left-2 top-2 z-10 m-0 rounded-[8px] border border-fal-yellow/50 bg-fal-yellow/95 px-2 py-1 text-[11px] font-extrabold text-fal-navy-dark shadow-sm">
            Modelo 3D provisório
          </p>
        ) : null}
        {resolved === 'xr' && xrMode ? (
          <VehicleXrLauncher
            mode={xrMode}
            payload={payload}
            reduceMotion={reduceMotion}
            approvedAsset={approvedAsset}
            syncEnabled={syncEnabled}
            modelParts={modelParts}
            orphanCount={orphanInstallCount}
            onFallback={(reason) => {
              setXrUserFallback(true)
              recordVisualTelemetry({
                source: 'xr',
                outcome: 'fallback',
                reason,
                reducedMotion: reduceMotion,
              })
            }}
          >
            {canvas}
          </VehicleXrLauncher>
        ) : (
          canvas
        )}
      </div>
      <p className="m-0 text-xs text-fal-muted" id="fal-visual-engine-status">
        {visualizationSourceLabel(renderSource)}
        {glbLoadFailed ? ' · não foi possível carregar o modelo completo' : ''}
        {reduceMotion ? ' · movimento reduzido ativo' : ''}
        {xrUserFallback ? ' · AR desligada nesta sessão' : ''}
      </p>
      {glbLoadFailed ? (
        <p className="m-0 text-xs font-semibold text-amber-800">
          Não carregamos o modelo 3D completo. Mostramos uma prévia. Recarregue a página para tentar
          de novo.
        </p>
      ) : null}
    </section>
  )
