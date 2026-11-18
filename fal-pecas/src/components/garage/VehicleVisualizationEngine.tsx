import { VehicleSilhouette2D } from '@/components/garage/VehicleSilhouette2D'
import type { VisualPartPreview } from '@/services/garage/vehicleVisualPartPreview'
import type { VehicleVisualAsset } from '@/services/garage/vehicleVisualAssetTypes'
import type { VehicleVisualPayload } from '@/services/garage/vehicleVisualTypes'
import {
  effectiveRenderSource,
  resolveVisualizationSource,
  visualizationSourceLabel,
  type VisualizationSource,
} from '@/services/garage/visualizationEngine'
import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'

const VehicleViewer3D = lazy(() => import('./VehicleViewer3D'))
const VehicleGlbViewer = lazy(() => import('./VehicleGlbViewer'))

/**
 * FAL Vehicle Visualization Engine (Fase B E3).
 * Adapters: 2d | procedural | glb (lazy). XR = Fase C.
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
  const assetKey = approvedAsset?.id ?? ''

  const onGlbError = useCallback((_reason: string) => {
    setGlbLoadFailed(true)
  }, [])

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
      }),
    [preferredMode, webglOk, hasApprovedGlb, approvedAsset],
  )

  const renderSource = useMemo(
    () => effectiveRenderSource(resolved, webglOk, { glbLoadFailed }),
    [resolved, webglOk, glbLoadFailed],
  )

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
      />
    </Suspense>
  )

  return (
    <div className="space-y-2">
      <p className="m-0 text-[11px] font-semibold text-fal-muted">
        Engine · resolvido: {visualizationSourceLabel(resolved)}
        {renderSource !== resolved ? ` · render: ${renderSource}` : ''}
        {glbLoadFailed ? ' · GLB falhou → procedural' : ''}
      </p>
      {renderSource === 'glb' && approvedAsset ? (
        <Suspense fallback={procedural}>
          <VehicleGlbViewer
            asset={approvedAsset}
            payload={payload}
            modelParts={modelParts}
            orphanInstallCount={orphanInstallCount}
            syncEnabled={syncEnabled}
            onError={onGlbError}
          />
        </Suspense>
      ) : renderSource === 'procedural' ? (
        procedural
      ) : (
        fallback2d
      )}
    </div>
  )
}
