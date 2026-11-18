import { VehicleSilhouette2D } from '@/components/garage/VehicleSilhouette2D'
import type { VisualPartPreview } from '@/services/garage/vehicleVisualPartPreview'
import type { VehicleVisualPayload } from '@/services/garage/vehicleVisualTypes'
import {
  effectiveRenderSource,
  resolveVisualizationSource,
  visualizationSourceLabel,
  type VisualizationSource,
} from '@/services/garage/visualizationEngine'
import { lazy, Suspense, useMemo } from 'react'

const VehicleViewer3D = lazy(() => import('./VehicleViewer3D'))

/**
 * FAL Vehicle Visualization Engine (Fase B E1).
 * A UI passa prefs/capabilities; o engine escolhe o adapter.
 * B1: 2d | procedural (glb/xr resolvidos no contrato, render degradado).
 */
export function VehicleVisualizationEngine({
  payload,
  modelParts,
  orphanInstallCount,
  syncEnabled,
  preferredMode,
  webglOk,
  hasApprovedGlb = false,
}: {
  payload: VehicleVisualPayload
  modelParts: VisualPartPreview[]
  orphanInstallCount: number
  syncEnabled: boolean
  preferredMode: 'auto' | '2d' | '3d'
  webglOk: boolean
  hasApprovedGlb?: boolean
}) {
  const resolved: VisualizationSource = useMemo(
    () =>
      resolveVisualizationSource({
        preferredMode,
        webglOk,
        hasApprovedGlb,
        xrEnabled: false,
        xrSupported: false,
      }),
    [preferredMode, webglOk, hasApprovedGlb],
  )

  const renderSource = useMemo(
    () => effectiveRenderSource(resolved, webglOk),
    [resolved, webglOk],
  )

  const fallback = (
    <VehicleSilhouette2D
      payload={payload}
      modelParts={modelParts}
      orphanInstallCount={orphanInstallCount}
      syncEnabled={syncEnabled}
    />
  )

  return (
    <div className="space-y-2">
      <p className="m-0 text-[11px] font-semibold text-fal-muted">
        Engine · resolvido: {visualizationSourceLabel(resolved)}
        {resolved === 'glb' || resolved === 'xr'
          ? ` · render B1: ${renderSource}`
          : ''}
      </p>
      {renderSource === 'procedural' ? (
        <Suspense fallback={fallback}>
          <VehicleViewer3D
            payload={payload}
            modelParts={modelParts}
            orphanInstallCount={orphanInstallCount}
            syncEnabled={syncEnabled}
          />
        </Suspense>
      ) : (
        fallback
      )}
    </div>
  )
}
