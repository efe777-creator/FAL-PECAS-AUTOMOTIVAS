import { formatMoney } from '@/lib/money'
import { formatContractedDims, parseOrderPacking } from '@/lib/orderPacking'
import { readContractedShipping } from '@/lib/contractedShipping'
import {
  ensureCheckoutQuoteFromMeta,
  latestOpsQuote,
  parseOpsQuotes,
} from '@/lib/opsShippingQuote'
import type { AdminOrderDetail } from '@/services/admin/adminOrderService'
import { useMemo } from 'react'

type Props = { order: AdminOrderDetail }

/** F3/C5 — frete/prazo/medidas da compra (cliente) vs packing / ops. Frete cobrado imutável. */
export function ContractedFreightSnapshotPanel({ order }: Props) {
  const meta = order.shipment?.metadata ?? null
  const packing = useMemo(() => parseOrderPacking(meta), [meta])
  const contracted = useMemo(
    () => readContractedShipping(order.shipment, order.shippingAmount),
    [order.shipment, order.shippingAmount],
  )
  const checkout = useMemo(
    () => ensureCheckoutQuoteFromMeta(meta, order.shippingAmount),
    [meta, order.shippingAmount],
  )
  const opsList = useMemo(() => parseOpsQuotes(meta), [meta])
  const latestOps = useMemo(() => latestOpsQuote(meta), [meta])
  const contractedDims = useMemo(() => {
    if (checkout.volumes.length) {
      return checkout.volumes
        .map(
          (v, i) =>
            `Vol ${i + 1}: ${v.lengthCm}×${v.widthCm}×${v.heightCm} cm · ${v.weightKg} kg`,
        )
        .join(' · ')
    }
    return formatContractedDims(meta)
  }, [checkout.volumes, meta])
  const packingDims =
    packing.volumes.length > 0
      ? packing.volumes
          .map(
            (v, i) =>
              `Vol ${i + 1}: ${v.lengthCm}×${v.widthCm}×${v.heightCm} cm · ${v.weightKg} kg`,
          )
          .join(' · ')
      : 'Packing ainda não registrado'

  const serviceLabel = checkout.label ?? contracted?.label ?? '—'
  const etaLabel = contracted?.etaLabel
  const charged = checkout.amount ?? contracted?.chargedAmount ?? order.shippingAmount
  const finance =
    meta?.finance && typeof meta.finance === 'object'
      ? (meta.finance as Record<string, unknown>)
      : null
  const effective =
    finance?.effective_cost != null && Number.isFinite(Number(finance.effective_cost))
      ? Number(finance.effective_cost)
      : latestOps?.quotedAmount ?? null
  const delta =
    charged != null && effective != null
      ? Number((charged - effective).toFixed(2))
      : finance?.delta != null
        ? Number(finance.delta)
        : null

  return (
    <section className="space-y-3 rounded-[14px] border border-fal-line bg-white p-4">
      <div>
        <h2 className="m-0 text-lg font-extrabold text-fal-navy">
          Cotação original × packing × ops
        </h2>
        <p className="mt-1 mb-0 text-sm text-fal-muted">
          O valor cobrado do cliente <strong>não muda</strong>. Recotes e etiqueta alimentam só o
          custo interno (G8).
        </p>
      </div>
      <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-[10px] border border-green-200 bg-green-50/60 p-3">
          <p className="m-0 text-xs font-bold uppercase tracking-wide text-green-900">
            Cotação original (compra)
          </p>
          <p className="mt-2 mb-0">
            <span className="text-fal-muted">Serviço:</span> <strong>{serviceLabel}</strong>
          </p>
          {checkout.company ? (
            <p className="mb-0">
              <span className="text-fal-muted">Transportadora:</span> {checkout.company}
            </p>
          ) : null}
          <p className="mb-0">
            <span className="text-fal-muted">Prazo:</span>{' '}
            <strong>{etaLabel ?? 'Não gravado no snapshot'}</strong>
          </p>
          <p className="mb-0">
            <span className="text-fal-muted">Valor cotado / cobrado:</span>{' '}
            <strong>{formatMoney(charged)}</strong>
          </p>
          <p className="mb-0">
            <span className="text-fal-muted">Volumes:</span> {checkout.volumeCount || '—'}
            {checkout.totalWeightKg != null
              ? ` · peso ${checkout.totalWeightKg} kg`
              : ''}
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
            Divergência → atualize packing, recote e selecione serviço. Cliente permanece com{' '}
            {formatMoney(order.shippingAmount)}.
          </p>
        </div>
        <div className="rounded-[10px] border border-sky-200 bg-sky-50/50 p-3">
          <p className="m-0 text-xs font-bold uppercase tracking-wide text-sky-950">
            Cotação operacional
          </p>
          {latestOps ? (
            <>
              <p className="mt-2 mb-0">
                <span className="text-fal-muted">Última recote:</span>{' '}
                {latestOps.quotedAmount != null
                  ? formatMoney(latestOps.quotedAmount)
                  : '—'}
                {latestOps.selectedServiceId != null
                  ? ` · serviço #${latestOps.selectedServiceId}`
                  : ''}
              </p>
              <p className="mb-0 text-xs text-fal-muted">
                Histórico: {opsList.length} recote(s)
              </p>
            </>
          ) : (
            <p className="mt-2 mb-0 text-fal-muted">Nenhuma recote operacional ainda.</p>
          )}
          {effective != null ? (
            <p className="mb-0 mt-2">
              <span className="text-fal-muted">Custo efetivo (G8):</span>{' '}
              <strong>{formatMoney(effective)}</strong>
              {delta != null ? (
                <span className="text-fal-muted"> · delta {formatMoney(delta)}</span>
              ) : null}
            </p>
          ) : null}
        </div>
      </div>
      {opsList.length > 0 ? (
        <details className="text-xs text-fal-muted">
          <summary className="cursor-pointer font-semibold text-fal-navy">
            Histórico de cotações operacionais
          </summary>
          <ul className="mt-2 list-none space-y-1 p-0">
            {[...opsList].reverse().map((e, i) => (
              <li key={`${e.at}-${i}`} className="rounded border border-fal-line px-2 py-1">
                {e.at} · {e.quotedAmount != null ? formatMoney(e.quotedAmount) : '—'}
                {e.selectedServiceId != null ? ` · svc #${e.selectedServiceId}` : ''}
                {e.options.length ? ` · ${e.options.length} opção(ões)` : ''}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  )
}
