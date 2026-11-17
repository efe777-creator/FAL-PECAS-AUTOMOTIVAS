import {
  adminActorKind,
  adminNextActionLabel,
  attentionSortKey,
  isAttentionOrder,
  type AdminActorKind,
} from '@/lib/adminOrderOps'
import type { AttentionActorFilter } from '@/lib/adminDashboardDeepLinks'
import { formatDateTime } from '@/lib/datetime'
import { formatMoney } from '@/lib/money'
import type { AdminOrderListRow } from '@/services/admin/adminOrderService'
import { listStatusLabel } from '@/pages/admin/orders/AdminOrdersListPanel'

type Props = {
  rows: AdminOrderListRow[]
  actor?: AttentionActorFilter
  limit?: number
  onSelectOrder: (id: string) => void
  title?: string
}

function matchesActor(
  kind: AdminActorKind,
  actor: AttentionActorFilter,
): boolean {
  if (actor === 'all') return kind === 'team' || kind === 'customer'
  return kind === actor
}

/** Lista “Exigem atenção” — compartilhada Hub + split do Painel. */
export function OrdersAttentionListPanel({
  rows,
  actor = 'all',
  limit = 12,
  onSelectOrder,
  title = 'Exigem atenção',
}: Props) {
  const attention = rows
    .filter((o) => isAttentionOrder(o.status, o.customerDecision))
    .filter((o) =>
      matchesActor(adminActorKind(o.status, o.customerDecision), actor),
    )
    .sort(
      (a, b) =>
        attentionSortKey(a.status, a.customerDecision) -
        attentionSortKey(b.status, b.customerDecision),
    )
    .slice(0, limit)

  return (
    <div className="rounded-[14px] border border-fal-line bg-fal-surface p-4">
      <h2 className="mt-0 text-base font-extrabold text-fal-fg">{title}</h2>
      {attention.length === 0 ? (
        <p className="text-sm text-fal-muted">Nenhuma pendência operacional agora.</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {attention.map((o) => (
            <li key={o.id} className="flex items-start justify-between gap-2 text-sm">
              <button
                type="button"
                className="min-w-0 text-left"
                onClick={() => onSelectOrder(o.id)}
              >
                <span className="font-semibold text-fal-fg">
                  {o.id.slice(0, 8)}… · {o.customerName ?? 'Cliente'}
                </span>
                <p className="mb-0 mt-0.5 text-xs font-extrabold text-fal-fg">
                  Faça agora:{' '}
                  {o.logisticsNextActionLabel ??
                    adminNextActionLabel(o.status, o.customerDecision)}
                </p>
                <p className="mb-0 mt-0.5 text-xs text-fal-muted">
                  {listStatusLabel(o)}
                  {o.shippingChoiceLabel ? ` · ${o.shippingChoiceLabel}` : ''}
                  {' · '}
                  {formatDateTime(o.createdAt)}
                </p>
              </button>
              <span className="shrink-0 font-semibold">{formatMoney(o.total)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
