import {
  ADMIN_LOGISTICS_QUEUES,
  type AdminLogisticsQueueId,
  type LogisticsQueueCounts,
} from '@/lib/adminLogisticsQueues'
import { Link } from 'react-router-dom'

type Props = {
  activeFila: AdminLogisticsQueueId
  counts: LogisticsQueueCounts | null
  onSelectFila: (fila: AdminLogisticsQueueId) => void
  /** Inclui link Revisão (visão separada). */
  showRevisaoLink?: boolean
}

/** Chips de filas logísticas — compartilhado Hub + split. */
export function OrdersLogisticsQueuesBar({
  activeFila,
  counts,
  onSelectFila,
  showRevisaoLink = true,
}: Props) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Filas logísticas">
      {ADMIN_LOGISTICS_QUEUES.filter((q) => q.id !== 'revisao').map((q) => {
        const active = activeFila === q.id
        const n = counts?.[q.id] ?? null
        return (
          <button
            key={q.id}
            type="button"
            aria-pressed={active}
            className={[
              'min-h-11 rounded-[10px] border px-3 text-sm font-bold',
              active
                ? 'border-fal-navy bg-fal-navy text-white'
                : 'border-fal-line bg-fal-surface text-fal-fg',
            ].join(' ')}
            onClick={() => onSelectFila(q.id)}
          >
            {q.title}
            {n != null ? ` (${n})` : ''}
          </button>
        )
      })}
      {showRevisaoLink ? (
        <Link
          to="/admin/pedidos/visao/revisao-logistica"
          className="inline-flex min-h-11 items-center rounded-[10px] border border-fal-line bg-fal-surface px-3 text-sm font-bold text-fal-fg"
        >
          Revisão
        </Link>
      ) : null}
    </div>
  )
}
