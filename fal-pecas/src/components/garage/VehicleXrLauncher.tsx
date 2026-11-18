import { Button } from '@/components/common/Button'
import { recordVisualTelemetry } from '@/services/garage/visualTelemetry'
import { useState } from 'react'

/**
 * Fase C C1 — launcher XR experimental.
 * Não cria fato 2A. Falha → onFallback (Engine usa glb/procedural/2d).
 */
export function VehicleXrLauncher({
  mode,
  reduceMotion,
  onFallback,
  children,
}: {
  mode: 'immersive-ar' | 'immersive-vr'
  reduceMotion: boolean
  onFallback: (reason: string) => void
  children: React.ReactNode
}) {
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

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
      const session = await navigator.xr.requestSession(mode, {
        requiredFeatures: mode === 'immersive-ar' ? ['local'] : ['local-floor'],
      })
      recordVisualTelemetry({
        source: 'xr',
        outcome: 'ok',
        durationMs: Math.round(performance.now() - t0),
        reason: mode,
        reducedMotion,
      })
      setMsg(`Sessão ${mode} iniciada (experimental). Feche no dispositivo para voltar.`)
      session.addEventListener('end', () => {
        setMsg('Sessão XR encerrada.')
        setBusy(false)
      })
      // C1: não acoplamos Three.WebXRRenderer ainda — sessão nativa prova capability.
      // Encerrar cedo evita sessão órfã sem frame loop.
      await session.end()
      recordVisualTelemetry({
        source: 'xr',
        outcome: 'ok',
        reason: 'session_probe_end',
        reducedMotion,
      })
      setMsg(
        `Dispositivo aceitou ${mode}. Integração de cena imersiva rica = C2+. Visual ≠ fato técnico.`,
      )
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
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-2" aria-label="Experiência XR experimental">
      <div className="rounded-fal border border-fal-accent/40 bg-fal-accent/5 p-3 text-sm">
        <p className="m-0 font-extrabold text-fal-fg">XR experimental (Fase C)</p>
        <p className="m-0 mt-1 text-xs text-fal-muted">
          Gate ativo. Modo: <strong>{mode}</strong>. Não altera histórico técnico do veículo.
          {reduceMotion ? ' Bloqueado por prefers-reduced-motion.' : ''}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            disabled={busy || reduceMotion}
            onClick={() => void startSession()}
          >
            Provar sessão {mode}
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
