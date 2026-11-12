import { formatMoney } from '@/lib/money'
import { parseOrderPacking } from '@/lib/orderPacking'
import { readContractedShipping } from '@/lib/contractedShipping'
import type { AdminOrderDetail } from '@/services/admin/adminOrderService'
import { useMemo } from 'react'

type Props = { order: AdminOrderDetail }

function dimsFromMeta(meta: Record<string, unknown> | null | undefined): string {
  if (!meta) return '—'
  const quote = (meta.quote ?? meta.contracted ?? meta.checkout) as
    | Record<string, unknown>
    | undefined
  const vols = (quote?.volumes ?? meta.volumes) as unknown
  if (Array.isArray(vols) && vols.length) {
    return vols
      .map((v, i) => {
        if (!v || typeof v !== 'object') return null
        const o = v as Record<string, unknown>
        const L = o.length_cm ?? o.lengthCm ?? o.length
        const W = o.width_cm ?? o.widthCm ?? o.width
        const H = o.height_cm ?? o.heightCm ?? o.height
        const kg = o.weight_kg ?? o.weightKg ?? o.weight
        return `Vol ${i + 1}: ${L}×${W}×${H} cm · ${kg} kg`
      })
      .filter(Boolean)
      .join(' · ')
  }
  const L = meta.length_cm ?? meta.lengthCm
  const W = meta.width_cm ?? meta.widthCm
  const H = meta.height_cm ?? meta.heightCm
  const kg = meta.weight_kg ?? meta.weightKg
  if (L != null && W != null && H != null) {
    return `${L}×${W}×${H} cm${kg != null ? ` · ${kg} kg` : ''}`
  }
  return 'Snapshot de medidas não gravado na compra'
}

/** F3 — frete/prazo/medidas da compra (cliente) vs packing atual. Frete cobrado é imutável. */
export function ContractedFreightSnapshotPanel({ order }: Props) {
  const meta = order.shipment?.metadata ?? null
  const packing = useMemo(() => parseOrderPacking(meta), [meta])
  const contracted = useMemo(
    () => readContractedShipping(order.shipment, order.shippingAmount),
    [order.shipment, order.shippingAmount],
  )
  const contractedDims = useMemo(() => dimsFromMeta(meta), [meta])
  const packingDims =
    packing.volumes.length > 0
      ? packing.volumes
          .map(
            (v, i) =>
              `Vol ${i + 1}: ${v.lengthCm}×${v.widthCm}×${v.heightCm} cm · ${v.weightKg} kg`,
          )
          .join(' · ')
      : 'Packing ainda não registrado'

  const serviceLabel = contracted?.label ?? '—'
  const etaLabel = contracted?.etaLabel
  const charged = contracted?.chargedAmount ?? order.shippingAmount

  return (
    <section className="space-y-3 rounded-[14px] border border-fal-line bg-white p-4">
      <div>
        <h2 className="m-0 text-lg font-extrabold text-fal-navy">
          Frete da compra (cliente) × packing
        </h2>
        <p className="mt-1 mb-0 text-sm text-fal-muted">
          O valor e o prazo cobrados do cliente <strong>não mudam</strong>. Atualize
          medidas/cotação só para custo interno e etiqueta (painel G8 / packing).
        </p>
      </div>
      <div className="grid gap-3 text-sm sm:grid-cols-2">
        <div className="rounded-[10px] border border-green-200 bg-green-50/60 p-3">
          <p className="m-0 text-xs font-bold uppercase tracking-wide text-green-900">
            Contratado na compra
          </p>
          <p className="mt-2 mb-0">
            <span className="text-fal-muted">Escolha:</span>{' '}
            <strong>{serviceLabel}</strong>
            {contracted && contracted.modality !== contracted.label ? (
              <span className="text-fal-muted"> ({contracted.modality})</span>
            ) : null}
          </p>
          <p className="mb-0">
            <span className="text-fal-muted">Prazo:</span>{' '}
            <strong>{etaLabel ?? 'Não gravado no snapshot'}</strong>
          </p>
          <p className="mb-0">
            <span className="text-fal-muted">Frete cobrado:</span>{' '}
            <strong>{formatMoney(charged)}</strong>
          </p>
          <p className="mb-0 mt-1">
            <span className="text-fal-muted">Medidas:</span> {contractedDims}
          </p>
        </div>
        <div className="rounded-[10px] border border-amber-200 bg-amber-50/50 p-3">
          <p className="m-0 text-xs font-bold uppercase tracking-wide text-amber-950">
            Packing atual (interno)
          </p>
          <p className="mt-2 mb-0 text-fal-ink">{packingDims}</p>
          <p className="mb-0 mt-2 text-xs text-fal-muted">
            Divergência → atualize packing e registre custo efetivo no G8. Cliente permanece
            com {formatMoney(order.shippingAmount)}
            {etaLabel ? ` e prazo “${etaLabel}”` : ''}.
          </p>
        </div>
      </div>
    </section>
  )
}
