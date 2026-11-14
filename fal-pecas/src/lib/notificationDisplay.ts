import type {
  AppNotification,
  AppNotificationCategory,
} from '@/services/notifications/appNotificationService'
import { notificationNeedsAction } from '@/lib/appNotificationCopy'
import { formatNotificationWhen } from '@/lib/datetime'

export const CATEGORY_LABELS: Record<AppNotificationCategory, string> = {
  pedidos: 'Pedidos',
  pagamentos: 'Pagamentos',
  entregas: 'Entregas',
  clientes: 'Clientes',
  estoque: 'Estoque',
  sistema: 'Sistema',
}

export type PriorityBadge = 'Nova' | 'Atenção' | 'Informativa'

export function notificationPriorityBadge(n: AppNotification): PriorityBadge {
  const needs = notificationNeedsAction({
    kind: n.kind,
    audience: n.audience,
    actionable: n.actionable,
  })
  if (needs || n.severity === 'acao_necessaria' || n.severity === 'importante') {
    return 'Atenção'
  }
  if (!n.readAt) return 'Nova'
  return 'Informativa'
}

/** Selo só quando agrega informação (não mostra Informativa em tudo). */
export function notificationPriorityBadgeVisible(
  n: AppNotification,
): Exclude<PriorityBadge, 'Informativa'> | null {
  const badge = notificationPriorityBadge(n)
  return badge === 'Informativa' ? null : badge
}

/** Ação pendente primeiro, depois não lidas, depois data. */
export function sortNotificationsForInbox(items: AppNotification[]): AppNotification[] {
  return [...items].sort((a, b) => {
    const aAct =
      notificationNeedsAction({ kind: a.kind, audience: a.audience, actionable: a.actionable }) &&
      !a.readAt
        ? 0
        : 1
    const bAct =
      notificationNeedsAction({ kind: b.kind, audience: b.audience, actionable: b.actionable }) &&
      !b.readAt
        ? 0
        : 1
    if (aAct !== bAct) return aAct - bAct
    if (!a.readAt && b.readAt) return -1
    if (a.readAt && !b.readAt) return 1
    return b.createdAt.localeCompare(a.createdAt)
  })
}

export function categoryLabel(category: AppNotificationCategory | null | undefined): string {
  if (!category) return 'Sistema'
  return CATEGORY_LABELS[category] ?? 'Sistema'
}

export function orderRefFromNotification(n: AppNotification): string | null {
  if (n.orderId) return n.orderId.replace(/-/g, '').slice(0, 8).toUpperCase()
  const m = n.body?.match(/Pedido\s*#([A-Za-z0-9]+)/i)
  return m?.[1] ?? null
}

export function notificationMetaLine(n: AppNotification): string {
  const when = formatNotificationWhen(n.createdAt)
  const cat = categoryLabel(n.category)
  return `${when} · ${cat}`
}
