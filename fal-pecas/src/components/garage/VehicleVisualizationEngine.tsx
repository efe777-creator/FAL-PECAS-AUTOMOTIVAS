import { VehicleSilhouette2D } from '@/components/garage/VehicleSilhouette2D'
import { prefersReducedMotion } from '@/lib/visualMotionPrefs'
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
 * FAL Vehicle Visualization Engine (Fase B E5).
 * Adapters: 2d | procedural | glb (lazy). A11y + telemetria mínima.
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
  const assetKey = approvedAsset?.id ?? ''

  useEffect(() => {
    setReduceMotion(prefersReducedMotion())
  }, [])

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
        xrEnabled: false,
        xrSupported: false,
        reducedMotion: reduceMotion,
      }),
    [preferredMode, webglOk, hasApprovedGlb, approvedAsset, reduceMotion],
  )

  const renderSource = useMemo(
    () => effectiveRenderSource(resolved, webglOk, { glbLoadFailed }),
    [resolved, webglOk, glbLoadFailed],
  )

  useEffect(() => {
    if (renderSource === '2d') {
      recordVisualTelemetry({
        source: '2d',
        outcome: !webglOk || preferredMode === '2d' || reduceMotion ? 'ok' : 'fallback',
        reason: !webglOk ? 'no_webgl' : reduceMotion ? 'reduced_motion' : preferredMode,
        reducedMotion: reduceMotion,
      })
    }
  }, [renderSource, webglOk, preferredMode, reduceMotion])

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

  return (
    <section
      className="space-y-2"
      aria-label="Visualização do veículo"
    >
      <p className="m-0 text-[11px] font-semibold text-fal-muted" id="fal-visual-engine-status">
        Engine · resolvido: {visualizationSourceLabel(resolved)}
        {renderSource !== resolved ? ` · render: ${renderSource}` : ''}
        {glbLoadFailed ? ' · GLB falhou → procedural' : ''}
        {reduceMotion ? ' · prefers-reduced-motion' : ''}
      </p>
      <div aria-describedby="fal-visual-engine-status">
        {renderSource === 'glb' && approvedAsset ? (
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
        )}
      </div>
    </section>
  )
}
