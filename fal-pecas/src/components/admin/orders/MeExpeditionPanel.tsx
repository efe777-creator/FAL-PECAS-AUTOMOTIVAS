import { Button } from '@/components/common/Button'
import { confirmDialog } from '@/components/common/ConfirmDialog'
import { Input } from '@/components/common/Input'
import { toUserMessage } from '@/lib/toUserMessage'
import {
  alreadyGenerated,
  alreadyPurchased,
  canPurchaseLabel,
  meLabelState,
  meLabelStateLabel,
  parseMeMeta,
} from '@/lib/melhorEnvioLabelState'
import { formatMoney } from '@/lib/money'
import type { AdminOrderDetail } from '@/services/admin/adminOrderService'
import {
  meGenerateLabel,
  mePrepareLabel,
  mePrintLabel,
  mePurchaseLabel,
  meQuoteLabel,
} from '@/services/admin/melhorEnvioAdminService'
import { useMemo, useState } from 'react'

type Props = {
  order: AdminOrderDetail
  busy: boolean
  pendingShip: boolean
  carrier: string
  service: string
  tracking: string
  onCarrier: (v: string) => void
  onService: (v: string) => void
  onTracking: (v: string) => void
  onRequestShip: () => void
  onReload: () => Promise<void>
  onMessage: (msg: string | null) => void
  onError: (msg: string | null) => void
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Abre o romaneio via Blob URL. Retorna false se o popup foi bloqueado. */
function openRomaneio(order: AdminOrderDetail): boolean {
  const addr = order.addressSnapshot
  const addrLine = addr
    ? [
        addr.street,
        addr.number,
        addr.complement,
        addr.district,
        addr.city,
        addr.state,
        addr.cep ?? addr.zip,
      ]
        .filter(Boolean)
        .join(', ')
    : '—'
  const itemsHtml = order.items
    .map(
      (it) =>
        `<tr><td>${escapeHtml(it.sku)}</td><td>${escapeHtml(it.nameSnapshot)}</td><td>${escapeHtml(it.quantity)}</td></tr>`,
    )
    .join('')
  const html = `<!doctype html><html><head><meta charset="utf-8"/><title>Romaneio ${escapeHtml(order.id.slice(0, 8))}</title>
    <style>body{font-family:system-ui;padding:24px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccc;padding:6px;text-align:left}</style>
    </head><body>
    <h1>Romaneio interno FAL</h1>
    <p><strong>Pedido:</strong> ${escapeHtml(order.id)}<br/>
    <strong>Cliente:</strong> ${escapeHtml(order.customerName ?? '—')}<br/>
    <strong>Endereço:</strong> ${escapeHtml(addrLine)}<br/>
    <strong>Frete cobrado:</strong> R$ ${order.shippingAmount.toFixed(2)}</p>
    <table><thead><tr><th>Código</th><th>Produto</th><th>Qtd</th></tr></thead><tbody>${itemsHtml}</tbody></table>
    <p style="margin-top:24px;font-size:12px;color:#666">Etiqueta Melhor Envio é separada deste romaneio. Postagem física = Registrar entrega à transportadora.</p>
    <script>window.print()</script></body></html>`
  // Sem 'noopener': com noopener o window.open retorna null e não dá para escrever no popup.
  // Blob URL evita document.write e funciona com o script de impressão.
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const w = window.open(url, '_blank', 'width=800,height=900')
  if (!w) {
    URL.revokeObjectURL(url)
    return false
  }
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
  return true
}

export function MeExpeditionPanel({
  order,
  busy,
  pendingShip,
  carrier,
  service,
  tracking,
  onCarrier,
  onService,
  onTracking,
  onRequestShip,
  onReload,
  onMessage,
  onError,
}: Props) {
  const [meBusy, setMeBusy] = useState(false)
  const [weightKg, setWeightKg] = useState('')
  const [heightCm, setHeightCm] = useState('')
  const [widthCm, setWidthCm] = useState('')
  const [lengthCm, setLengthCm] = useState('')
  const [lastQuote, setLastQuote] = useState<number | null>(null)
  const [divergenceMsg, setDivergenceMsg] = useState<string | null>(null)

  const labelState = useMemo(
    () => meLabelState(order.shipment?.metadata ?? null),
    [order.shipment?.metadata],
  )
  const me = useMemo(() => parseMeMeta(order.shipment?.metadata ?? null), [order.shipment?.metadata])
  const canBuy = canPurchaseLabel(order.status, labelState)

  async function runMe(fn: () => Promise<{ ok: boolean; message?: string; error?: string; divergence?: { blocked: boolean; reason?: string; labelAmount?: number } | null; printUrl?: string | null }>) {
    setMeBusy(true)
    onError(null)
    onMessage(null)
    setDivergenceMsg(null)
    try {
      const r = await fn()
      if (r.divergence?.blocked) {
        setDivergenceMsg(r.divergence.reason ?? 'Divergência de frete — compra bloqueada.')
        if (r.divergence.labelAmount != null) setLastQuote(r.divergence.labelAmount)
      }
      if (!r.ok) {
        onError(r.error ?? r.message ?? 'Operação Melhor Envio falhou')
      } else {
        onMessage(r.message ?? 'Melhor Envio: operação concluída')
        if (r.printUrl) window.open(r.printUrl, '_blank', 'noopener,noreferrer')
      }
      await onReload()
    } catch (e) {
      onError(toUserMessage(e, 'Falha no Melhor Envio'))
    } finally {
      setMeBusy(false)
    }
  }

  const packageOverride =
    weightKg || heightCm || widthCm || lengthCm
      ? {
          weightKg: weightKg ? Number(weightKg) : undefined,
          heightCm: heightCm ? Number(heightCm) : undefined,
          widthCm: widthCm ? Number(widthCm) : undefined,
          lengthCm: lengthCm ? Number(lengthCm) : undefined,
        }
      : undefined

  return (
    <section className="space-y-4 rounded-[14px] border border-fal-line bg-white p-4">
      <div>
        <h2 className="m-0 text-lg font-extrabold text-fal-navy">7. Expedição e entrega</h2>
        <p className="mt-1 mb-0 text-sm text-fal-muted">
          Etiqueta Melhor Envio, postagem física e entrega ao cliente são passos separados. Frete
          cobrado do cliente:{' '}
          <strong>{formatMoney(order.shippingAmount)}</strong>.
        </p>
        <p className="mt-2 mb-0 text-sm font-semibold text-fal-navy">
          Situação da etiqueta: {meLabelStateLabel(labelState)}
          {me.label_amount != null ? ` · etiqueta ${formatMoney(me.label_amount)}` : ''}
          {lastQuote != null && me.label_amount == null ? ` · cotado ${formatMoney(lastQuote)}` : ''}
        </p>
        {me.protocol ? (
          <p className="mt-1 mb-0 text-xs text-fal-muted">
            Protocolo: {me.protocol}
            {me.tracking ? ` · Rastreio Melhor Envio: ${me.tracking}` : ''}
          </p>
        ) : null}
        {me.last_error ? (
          <p className="mt-1 mb-0 text-xs text-red-600">
            Último erro Melhor Envio: {me.last_error}
          </p>
        ) : null}
        {divergenceMsg ? (
          <p className="mt-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950">
            {divergenceMsg}
          </p>
        ) : null}
      </div>

      <div>
        <h3 className="m-0 text-sm font-bold text-fal-navy">Conferência do pacote</h3>
        <p className="mt-1 text-xs text-fal-muted">
          Se o pacote real divergir da cotação, informe medidas e recote antes de comprar. Sem
          inventar dimensões vazias.
        </p>
        <div className="mt-2 grid gap-2 sm:grid-cols-4">
          <Input label="Peso (kg)" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} />
          <Input label="Altura (cm)" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} />
          <Input label="Largura (cm)" value={widthCm} onChange={(e) => setWidthCm(e.target.value)} />
          <Input
            label="Comprimento (cm)"
            value={lengthCm}
            onChange={(e) => setLengthCm(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="light"
          disabled={busy || meBusy}
          onClick={() => void runMe(() => meQuoteLabel(order.id, packageOverride))}
        >
          Cotar etiqueta
        </Button>
        <Button
          type="button"
          variant="light"
          disabled={busy || meBusy || alreadyPurchased(labelState)}
          onClick={() => void runMe(() => mePrepareLabel(order.id))}
        >
          Preparar carrinho Melhor Envio
        </Button>
        <Button
          type="button"
          disabled={busy || meBusy || !canBuy}
          onClick={() => {
            void confirmDialog({
              title: 'Comprar etiqueta?',
              message:
                'Confirmar compra da etiqueta no Melhor Envio (ambiente de testes)?\n\nIsto NÃO marca o pedido como enviado.',
              confirmLabel: 'Comprar etiqueta',
            })
              .then(({ confirmed }) => {
                if (!confirmed) return
                return runMe(() => mePurchaseLabel(order.id, true))
              })
              .catch((e) => onError(toUserMessage(e, 'Falha ao comprar etiqueta')))
          }}
        >
          Comprar etiqueta
        </Button>
        <Button
          type="button"
          variant="light"
          disabled={busy || meBusy || !alreadyPurchased(labelState) || alreadyGenerated(labelState)}
          onClick={() => void runMe(() => meGenerateLabel(order.id))}
        >
          Gerar etiqueta
        </Button>
        <Button
          type="button"
          variant="light"
          disabled={busy || meBusy || !alreadyGenerated(labelState)}
          onClick={() => void runMe(() => mePrintLabel(order.id))}
        >
          Imprimir etiqueta
        </Button>
        <Button type="button" variant="light" disabled={busy || meBusy} onClick={() => {
            if (!openRomaneio(order)) {
              onError('Não foi possível abrir o romaneio. Libere pop-ups para este site.')
            }
          }}>
          Romaneio interno
        </Button>
      </div>

      <div className="border-t border-fal-line pt-4">
        <h3 className="m-0 text-sm font-bold text-fal-navy">
          Entrega à transportadora (postagem física)
        </h3>
        <p className="mt-1 text-xs text-fal-muted">
          Só use depois de embalar e (se aplicável) imprimir a etiqueta. O pedido passa a enviado.
        </p>
        <div className="mt-3 grid gap-2 md:grid-cols-4">
          <Input label="Transportadora" value={carrier} onChange={(e) => onCarrier(e.target.value)} />
          <Input label="Serviço" value={service} onChange={(e) => onService(e.target.value)} />
          <Input label="Rastreio" value={tracking} onChange={(e) => onTracking(e.target.value)} />
          <div className="flex items-end">
            <Button type="button" disabled={busy || pendingShip || meBusy} onClick={onRequestShip}>
              Registrar entrega à transportadora
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
