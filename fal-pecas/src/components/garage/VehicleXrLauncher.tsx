import { Button } from '@/components/common/Button'
import type { VehicleVisualPayload } from '@/services/garage/vehicleVisualTypes'
import {
  startVisualXrImmersiveSession,
  type VisualXrSessionHandle,
} from '@/services/garage/visualXrSession'
import { recordVisualTelemetry } from '@/services/garage/visualTelemetry'
import { useEffect, useRef, useState, type ReactNode } from 'react'

/**
 * Fase C C2 — launcher XR com sessão imersiva (cena procedural).
 * Não cria fato 2A. Falha → onFallback (Engine usa glb/procedural/2d).
 */
export function VehicleXrLauncher({
  mode,
  payload,
  reduceMotion,
  onFallback,
  children,
}: {
  mode: 'immersive-ar' | 'immersive-vr'
  payload: VehicleVisualPayload
  reduceMotion: boolean
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
      const handle = await startVisualXrImmersiveSession({
        mode,
        payload,
        reduceMotion,
      })
      handleRef.current = handle
      recordVisualTelemetry({
        source: 'xr',
        outcome: 'ok',
        durationMs: Math.round(performance.now() - t0),
        reason: `immersive_${mode}`,
        reducedMotion,
      })
      setMsg(
        `Sessão ${mode} ativa (C2). Feche no headset/dispositivo para voltar. Visual ≠ fato técnico.`,
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
        <p className="m-0 font-extrabold text-fal-fg">XR experimental (Fase C · C2)</p>
        <p className="m-0 mt-1 text-xs text-fal-muted">
          Gate ativo. Modo: <strong>{mode}</strong>. Cena procedural imersiva (hit-test/peças =
          C3+). Não altera histórico técnico.
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
