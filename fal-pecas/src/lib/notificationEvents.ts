import type { AppNotificationAudience } from '@/services/notifications/appNotificationService'

export const FAL_NOTIF_CHANGED = 'fal:notif-changed'

export type NotifChangedDetail = {
  audience: AppNotificationAudience
  /** Contagem otimista — sinos irmãos atualizam o badge sem esperar o RPC. */
  unread?: number
}

const fallbackBus = new EventTarget()

function bus(): EventTarget {
  return typeof window !== 'undefined' ? window : fallbackBus
}

export function emitNotifChanged(
  audience: AppNotificationAudience,
  opts?: { unread?: number },
): void {
  bus().dispatchEvent(
    new CustomEvent<NotifChangedDetail>(FAL_NOTIF_CHANGED, {
      detail: { audience, unread: opts?.unread },
    }),
  )
}

export function subscribeNotifChanged(
  handler: (detail: NotifChangedDetail) => void,
): () => void {
  const target = bus()
  function onEvent(e: Event) {
    const ce = e as CustomEvent<NotifChangedDetail>
    if (!ce.detail?.audience) return
    handler(ce.detail)
  }
  target.addEventListener(FAL_NOTIF_CHANGED, onEvent)
  return () => target.removeEventListener(FAL_NOTIF_CHANGED, onEvent)
}
