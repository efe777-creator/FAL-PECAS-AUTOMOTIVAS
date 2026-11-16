import { Button } from '@/components/common/Button'
import { EmptyState } from '@/components/common/EmptyState'
import { NotificationInboxItem } from '@/components/notifications/NotificationInboxItem'
import { notificationNeedsAction } from '@/lib/appNotificationCopy'
import { sortNotificationsForInbox } from '@/lib/notificationDisplay'
import type { AppNotification } from '@/services/notifications/appNotificationService'
import { useMemo, useState, type ReactNode } from 'react'

export type InboxFilter = 'all' | 'unread' | 'action'

type Props = {
  items: AppNotification[]
  unreadTotal: number
  busy?: boolean
  emptyActionLabel: string
  emptyActionTo: string
  emptyDescription: string
  onOpen: (n: AppNotification) => void
  onMarkAll: () => void
  headerExtra?: ReactNode
  eyebrow?: string
  title?: string
}

export function NotificationInbox({
  items,
  unreadTotal,
  busy,
  emptyActionLabel,
  emptyActionTo,
  emptyDescription,
  onOpen,
  onMarkAll,
  headerExtra,
  eyebrow = 'Avisos',
  title = 'Notificações',
}: Props) {
  const [filter, setFilter] = useState<InboxFilter>('all')

  const sorted = useMemo(() => sortNotificationsForInbox(items), [items])
  const actionCount = useMemo(
    () =>
      items.filter((n) =>
        notificationNeedsAction({ kind: n.kind, audience: n.audience, actionable: n.actionable }),
      ).length,
    [items],
  )

  const visible = useMemo(() => {
    if (filter === 'unread') return sorted.filter((n) => !n.readAt)
    if (filter === 'action') {
      return sorted.filter((n) =>
        notificationNeedsAction({ kind: n.kind, audience: n.audience, actionable: n.actionable }),
      )
    }
    return sorted
  }, [sorted, filter])

  return (
    <div className="min-w-0 space-y-4 overflow-x-hidden">
      <div className="rounded-fal border border-fal-line bg-white p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="m-0 text-[11px] font-bold uppercase tracking-wide text-fal-muted">
              {eyebrow}
            </p>
            <h2 className="mt-1 mb-0 text-xl font-extrabold text-fal-navy sm:text-2xl">{title}</h2>
            <p className="mb-0 mt-2 text-sm text-fal-muted">
              Avisos do pedido, pagamento, entrega e decisões.
            </p>
          </div>
          {headerExtra ? <div className="flex flex-wrap gap-2">{headerExtra}</div> : null}
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="flex min-w-0 flex-wrap gap-2" role="tablist" aria-label="Filtrar notificações">
            <Button
              type="button"
              variant={filter === 'all' ? 'primary' : 'outline'}
              onClick={() => setFilter('all')}
            >
              Todas
            </Button>
            <Button
              type="button"
              variant={filter === 'unread' ? 'primary' : 'outline'}
              onClick={() => setFilter('unread')}
            >
              Não lidas{unreadTotal > 0 ? ` (${unreadTotal})` : ''}
            </Button>
            <Button
              type="button"
              variant={filter === 'action' ? 'primary' : 'outline'}
              onClick={() => setFilter('action')}
            >
              <span className="sm:hidden">Ação{actionCount > 0 ? ` (${actionCount})` : ''}</span>
              <span className="hidden sm:inline">
                Precisam de ação{actionCount > 0 ? ` (${actionCount})` : ''}
              </span>
            </Button>
          </div>
          <Button
            type="button"
            variant="light"
            className="w-full sm:ml-auto sm:w-auto"
            disabled={busy || unreadTotal === 0}
            onClick={onMarkAll}
          >
            Marcar todas como lidas
          </Button>
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          title={
            filter === 'unread'
              ? 'Nenhuma não lida'
              : filter === 'action'
                ? 'Nada precisa de ação agora'
                : 'Nenhuma notificação ainda'
          }
          description={emptyDescription}
          actionLabel={emptyActionLabel}
          actionTo={emptyActionTo}
        />
      ) : (
        <ul className="m-0 min-w-0 list-none space-y-2 overflow-x-hidden p-0">
          {visible.map((n) => (
            <li key={n.id} className="min-w-0">
              <NotificationInboxItem notification={n} busy={busy} onOpen={onOpen} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
