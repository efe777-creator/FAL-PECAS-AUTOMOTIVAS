import { Button } from '@/components/common/Button'
import { useCart } from '@/contexts/CartContext'
import { useToast } from '@/components/common/Toast'
import { toUserMessage } from '@/lib/toUserMessage'
import { signVisualAssetUrl } from '@/services/garage/vehicleVisualAssetService'
import type { VehicleVisualAsset } from '@/services/garage/vehicleVisualAssetTypes'
import type { VisualPartPreview } from '@/services/garage/vehicleVisualPartPreview'
import type { VehicleVisualPayload } from '@/services/garage/vehicleVisualTypes'
import {
  buildXrCommercialParts,
  xrCartPath,
  xrCommercialTelemetryReason,
  xrExitToCartTelemetryReason,
  xrNeverPaysInSession,
  xrProductPath,
} from '@/services/garage/visualXrCommercial'
import {
  startVisualXrImmersiveSession,
  type VisualXrSessionHandle,
} from '@/services/garage/visualXrSession'
import { recordVisualTelemetry } from '@/services/garage/visualTelemetry'
import { getProductById } from '@/services/products/productService'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'

/**
 * Fase C C5 — launcher XR: hit-test + GLB + ficha + exit-to-cart.
 * Pagamento nunca in-XR (`xrNeverPaysInSession`).
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
  const { addItem } = useCart()
  const toast = useToast()
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

  async function endAndRun(after: () => void | Promise<void>) {
    const h = handleRef.current
    handleRef.current = null
    if (h) await h.end()
    await after()
  }

  async function startSession() {
    void xrNeverPaysInSession()
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
          void endAndRun(() => {
            navigate(xrProductPath(productId))
          })
        },
        onExitToCart: (productId) => {
          void (async () => {
            recordVisualTelemetry({
              source: 'xr',
              outcome: 'ok',
              reason: xrExitToCartTelemetryReason(productId),
              reducedMotion,
            })
            try {
              const product = await getProductById(productId)
              if (!product) throw new Error('produto_indisponivel')
              await endAndRun(() => {
                addItem(product, 1)
                toast.push('Item adicionado — finalize na web (sem pagamento na XR)', 'success')
                navigate(xrCartPath())
              })
            } catch (e) {
              recordVisualTelemetry({
                source: 'xr',
                outcome: 'error',
                reason: 'exit_to_cart_failed',
                reducedMotion,
              })
              toast.push(toUserMessage(e, 'Não foi possível ir ao carrinho'), 'error')
              await endAndRun(() => {
                navigate(xrProductPath(productId))
              })
            }
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
          'c5_exit_to_cart',
        ].join('+'),
        assetCode: approvedAsset?.code,
        reducedMotion,
      })
      const bits = [
        handle.usedGlb ? 'GLB' : 'procedural',
        handle.usedHitTest ? 'hit-test AR' : null,
        handle.commercialCount
          ? `${handle.commercialCount} SKU(s) · Carrinho web`
          : handle.partMarkerCount
            ? `${handle.partMarkerCount} marcador(es)`
            : null,
      ].filter(Boolean)
      setMsg(`Sessão ${mode} ativa (C5 · ${bits.join(' · ')}). Pagamento só na web.`)
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
        <p className="m-0 font-extrabold text-fal-fg">XR experimental (Fase C · C5)</p>
        <p className="m-0 mt-1 text-xs text-fal-muted">
          Gate ativo. Modo: <strong>{mode}</strong>
          {approvedAsset ? ` · GLB ${approvedAsset.code}` : ' · procedural'}
          {commercialParts.length
            ? ` · ${commercialParts.length} peça(s) com SKU`
            : syncEnabled
              ? ' · sync sem SKU elegível'
              : ''}
          . C5: sair para carrinho web — <strong>nunca</strong> pagamento na XR.
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
