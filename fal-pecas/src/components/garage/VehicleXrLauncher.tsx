import { Button } from '@/components/common/Button'
import { signVisualAssetUrl } from '@/services/garage/vehicleVisualAssetService'
import type { VehicleVisualAsset } from '@/services/garage/vehicleVisualAssetTypes'
import type { VisualPartPreview } from '@/services/garage/vehicleVisualPartPreview'
import type { VehicleVisualPayload } from '@/services/garage/vehicleVisualTypes'
import {
  buildXrCommercialParts,
  xrCommercialTelemetryReason,
  xrNeverCheckoutsInSession,
  xrProductPath,
} from '@/services/garage/visualXrCommercial'
import {
  startVisualXrImmersiveSession,
  type VisualXrSessionHandle,
} from '@/services/garage/visualXrSession'
import { recordVisualTelemetry } from '@/services/garage/visualTelemetry'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'

/**
 * Fase C C4 — launcher XR: hit-test + GLB + bridge SKU → ficha (sem checkout in-XR).
 */
export function VehicleXrLauncher({
  mode,
  payload,
  reduceMotion,
  approvedAsset = null,
  syncEnabled = false,
  modelParts = [],
  orphanCount = 0,
  onFallback,
  children,
}: {
  mode: 'immersive-ar' | 'immersive-vr'
  payload: VehicleVisualPayload
  reduceMotion: boolean
  approvedAsset?: VehicleVisualAsset | null
  syncEnabled?: boolean
  modelParts?: VisualPartPreview[]
  orphanCount?: number
  onFallback: (reason: string) => void
  children: ReactNode
}) {
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const handleRef = useRef<VisualXrSessionHandle | null>(null)

  const commercialParts = useMemo(
    () => buildXrCommercialParts(modelParts, syncEnabled),
    [modelParts, syncEnabled],
  )

  useEffect(() => {
    return () => {
      const h = handleRef.current
      handleRef.current = null
      if (h) void h.end()
    }
  }, [])

  async function startSession() {
    void xrNeverCheckoutsInSession()
    if (reduceMotion) {
      onFallback('reduced_motion')
      return
    }
    if (!navigator.xr) {
      onFallback('no_xr_api')
      return
    }
    setBusy(true)
    setMsg(null)
    const t0 = performance.now()
    try {
      if (handleRef.current) {
        await handleRef.current.end()
        handleRef.current = null
      }

      let glbUrl: string | null = null
      if (approvedAsset?.storagePath) {
        try {
          glbUrl = await signVisualAssetUrl(approvedAsset.storagePath, 180)
        } catch {
          glbUrl = null
        }
      }

      const handle = await startVisualXrImmersiveSession({
        mode,
        payload,
        reduceMotion,
        glbUrl,
        syncEnabled,
        modelPartCount: modelParts.length,
        orphanCount,
        commercialParts,
        onCommercialInterest: (part) => {
          recordVisualTelemetry({
            source: 'xr',
            outcome: 'ok',
            reason: xrCommercialTelemetryReason(part),
            reducedMotion,
          })
        },
        onOpenProduct: (productId) => {
          recordVisualTelemetry({
            source: 'xr',
            outcome: 'ok',
            reason: 'open_product_sheet',
            reducedMotion,
          })
          const h = handleRef.current
          handleRef.current = null
          void (async () => {
            if (h) await h.end()
            navigate(xrProductPath(productId))
          })()
        },
      })
      handleRef.current = handle
      recordVisualTelemetry({
        source: 'xr',
        outcome: 'ok',
        durationMs: Math.round(performance.now() - t0),
        reason: [
          `immersive_${mode}`,
          handle.usedHitTest ? 'hit_test' : 'no_hit_test',
          handle.usedGlb ? 'glb' : 'procedural',
          `markers_${handle.partMarkerCount}`,
          `commercial_${handle.commercialCount}`,
        ].join('+'),
        assetCode: approvedAsset?.code,
        reducedMotion,
      })
      const bits = [
        handle.usedGlb ? 'GLB' : 'procedural',
        handle.usedHitTest ? 'hit-test AR' : null,
        handle.commercialCount
          ? `${handle.commercialCount} SKU(s) no HUD`
          : handle.partMarkerCount
            ? `${handle.partMarkerCount} marcador(es)`
            : null,
      ].filter(Boolean)
      setMsg(`Sessão ${mode} ativa (C4 · ${bits.join(' · ')}). Sem checkout na XR.`)
      setBusy(false)
    } catch (e) {
      const reason = e instanceof Error ? e.message : 'xr_session_failed'
      recordVisualTelemetry({
        source: 'xr',
        outcome: 'fallback',
        reason,
        durationMs: Math.round(performance.now() - t0),
        reducedMotion,
      })
      setMsg(`XR indisponível: ${reason}`)
      onFallback(reason)
      setBusy(false)
    }
  }

  async function endSession() {
    const h = handleRef.current
    handleRef.current = null
    if (h) await h.end()
    setMsg('Sessão XR encerrada.')
    setBusy(false)
  }

  return (
    <div className="space-y-2" aria-label="Experiência XR experimental">
      <div className="rounded-fal border border-fal-accent/40 bg-fal-accent/5 p-3 text-sm">
        <p className="m-0 font-extrabold text-fal-fg">XR experimental (Fase C · C4)</p>
        <p className="m-0 mt-1 text-xs text-fal-muted">
          Gate ativo. Modo: <strong>{mode}</strong>
          {approvedAsset ? ` · GLB ${approvedAsset.code}` : ' · procedural'}
          {commercialParts.length
            ? ` · ${commercialParts.length} peça(s) com SKU`
            : syncEnabled
              ? ' · sync sem SKU elegível'
              : ''}
          . Bridge comercial = ver ficha (nunca checkout na XR).
          {reduceMotion ? ' Bloqueado por prefers-reduced-motion.' : ''}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            disabled={busy || reduceMotion}
            onClick={() => void startSession()}
          >
            Entrar em {mode}
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => void endSession()}>
            Encerrar XR
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => onFallback('user_skip')}>
            Usar viewer normal
          </Button>
        </div>
        {msg ? <p className="m-0 mt-2 text-xs font-semibold text-fal-muted">{msg}</p> : null}
      </div>
      {children}
    </div>
  )
}

export default VehicleXrLauncher
