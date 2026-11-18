import { Button } from '@/components/common/Button'
import { signVisualAssetUrl } from '@/services/garage/vehicleVisualAssetService'
import type { VehicleVisualAsset } from '@/services/garage/vehicleVisualAssetTypes'
import type { VehicleVisualPayload } from '@/services/garage/vehicleVisualTypes'
import {
  startVisualXrImmersiveSession,
  type VisualXrSessionHandle,
} from '@/services/garage/visualXrSession'
import { recordVisualTelemetry } from '@/services/garage/visualTelemetry'
import { useEffect, useRef, useState, type ReactNode } from 'react'

/**
 * Fase C C3 — launcher XR: hit-test AR + GLB opcional + marcadores sync.
 * Não cria fato 2A. Falha → onFallback.
 */
export function VehicleXrLauncher({
  mode,
  payload,
  reduceMotion,
  approvedAsset = null,
  syncEnabled = false,
  modelPartCount = 0,
  orphanCount = 0,
  onFallback,
  children,
}: {
  mode: 'immersive-ar' | 'immersive-vr'
  payload: VehicleVisualPayload
  reduceMotion: boolean
  approvedAsset?: VehicleVisualAsset | null
  syncEnabled?: boolean
  modelPartCount?: number
  orphanCount?: number
  onFallback: (reason: string) => void
  children: ReactNode
}) {
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const handleRef = useRef<VisualXrSessionHandle | null>(null)

  useEffect(() => {
    return () => {
      const h = handleRef.current
      handleRef.current = null
      if (h) void h.end()
    }
  }, [])

  async function startSession() {
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
        modelPartCount,
        orphanCount,
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
        ].join('+'),
        assetCode: approvedAsset?.code,
        reducedMotion,
      })
      const bits = [
        handle.usedGlb ? 'GLB' : 'procedural',
        handle.usedHitTest ? 'hit-test AR (toque para fixar)' : null,
        handle.partMarkerCount ? `${handle.partMarkerCount} marcador(es) sync` : null,
      ].filter(Boolean)
      setMsg(
        `Sessão ${mode} ativa (C3 · ${bits.join(' · ')}). Visual ≠ fato técnico.`,
      )
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
        <p className="m-0 font-extrabold text-fal-fg">XR experimental (Fase C · C3)</p>
        <p className="m-0 mt-1 text-xs text-fal-muted">
          Gate ativo. Modo: <strong>{mode}</strong>
          {approvedAsset ? ` · GLB ${approvedAsset.code}` : ' · procedural'}
          {syncEnabled ? ` · sync peças (${modelPartCount + orphanCount})` : ''}. Em AR, toque no
          anel amarelo para posicionar. Não altera histórico técnico.
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
