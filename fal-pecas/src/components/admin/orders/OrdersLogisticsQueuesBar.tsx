import {
  ADMIN_LOGISTICS_QUEUES,
  type AdminLogisticsQueueId,
  type LogisticsQueueCounts,
} from '@/lib/adminLogisticsQueues'

type Props = {
  activeFila: AdminLogisticsQueueId
  counts: LogisticsQueueCounts | null
  onSelectFila: (fila: AdminLogisticsQueueId) => void
}

/** Chips de filas logísticas — compartilhado Hub + split (inclui Revisão). */
export function OrdersLogisticsQueuesBar({
  activeFila,
  counts,
  onSelectFila,
}: Props) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Filas logísticas">
      {ADMIN_LOGISTICS_QUEUES.map((q) => {
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
    </div>
  )
}
