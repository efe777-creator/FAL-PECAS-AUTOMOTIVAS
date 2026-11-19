import { notificationNeedsAction } from '@/lib/appNotificationCopy'
import {
  notificationMetaLine,
  notificationPriorityBadgeVisible,
  orderRefFromNotification,
} from '@/lib/notificationDisplay'
import type { AppNotification } from '@/services/notifications/appNotificationService'

type Props = {
  notification: AppNotification
  busy?: boolean
  compact?: boolean
  onOpen: (n: AppNotification) => void
}

function badgeClass(label: string): string {
  if (label === 'Nova') return 'bg-fal-navy text-white'
  return 'bg-amber-700 text-white'
}

export function NotificationInboxItem({
  notification: n,
  busy,
  compact,
  onOpen,
}: Props) {
  const actionable = notificationNeedsAction({
    kind: n.kind,
    audience: n.audience,
    actionable: n.actionable,
  })
  const priority = notificationPriorityBadgeVisible(n)
  const orderRef = orderRefFromNotification(n)

  const shellClass = compact
    ? [
        'block w-full max-w-full px-3 py-2.5 text-left text-fal-fg hover:bg-fal-bg/80',
        actionable && !n.readAt
          ? 'bg-fal-yellow/20'
          : n.readAt
            ? 'opacity-80'
            : 'bg-fal-yellow/15',
      ].join(' ')
    : [
        'w-full max-w-full rounded-fal border px-3 py-3 text-left text-fal-fg transition hover:border-fal-line sm:px-4',
        actionable && !n.readAt
          ? 'border-fal-yellow-dark/50 bg-fal-yellow/25'
          : n.readAt
            ? 'border-fal-line bg-fal-surface'
            : 'border-fal-yellow-dark/40 bg-fal-yellow/20',
      ].join(' ')

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => onOpen(n)}
      className={`${shellClass} box-border min-w-0 overflow-hidden`}
      aria-label={n.title}
    >
      <span className="block min-w-0">
        <span
          className={`block break-words text-sm font-extrabold text-fal-fg ${
            compact ? 'line-clamp-2' : ''
          }`}
        >
          {n.title}
        </span>
        {priority ? (
          <span
            className={`mt-1 inline-block rounded-md px-1.5 py-0.5 text-[10px] font-bold ${badgeClass(priority)}`}
          >
            {priority}
          </span>
        ) : null}
      </span>
      {n.body ? (
        <span
          className={`mt-1 block min-w-0 break-words text-sm text-fal-muted ${
            compact ? 'line-clamp-2 text-xs' : ''
          }`}
        >
          {n.body}
        </span>
      ) : orderRef ? (
        <span className="mt-1 block break-words text-sm text-fal-muted">Pedido #{orderRef}</span>
      ) : null}
      <span className="mt-2 block break-words text-xs text-fal-muted">
        {notificationMetaLine(n)}
      </span>
    </button>
  )
}
