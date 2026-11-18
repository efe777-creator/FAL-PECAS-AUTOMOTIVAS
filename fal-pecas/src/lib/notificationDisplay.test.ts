import { describe, expect, it } from 'vitest'
import {
  categoryLabel,
  notificationMetaLine,
  notificationPriorityBadge,
  notificationPriorityBadgeVisible,
  orderRefFromNotification,
  sortNotificationsForInbox,
} from './notificationDisplay'
import type { AppNotification } from '@/services/notifications/appNotificationService'

function base(over: Partial<AppNotification> = {}): AppNotification {
  return {
    id: '1',
    audience: 'customer',
    channel: 'in_app',
    orderId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    sourceEventId: null,
    kind: 'payment_approved',
    title: 'Pagamento aprovado',
    body: 'Pedido #AABBCCDD — ok',
    href: '/conta/pedidos/x',
    readAt: null,
    createdAt: new Date().toISOString(),
    severity: 'importante',
    actionable: false,
    category: 'pagamentos',
    ...over,
  }
}

describe('notificationDisplay', () => {
  it('categoria e pedido', () => {
    expect(categoryLabel('pagamentos')).toBe('Pagamentos')
    expect(orderRefFromNotification(base())).toBe('AAAAAAAA')
  })

  it('badge Atenção para importante / ação', () => {
    expect(notificationPriorityBadge(base())).toBe('Atenção')
    expect(
      notificationPriorityBadge(
        base({ severity: 'informativa', kind: 'order_received', actionable: false, readAt: null }),
      ),
    ).toBe('Nova')
    expect(
      notificationPriorityBadge(
        base({
          severity: 'informativa',
          kind: 'order_received',
          actionable: false,
          readAt: new Date().toISOString(),
        }),
      ),
    ).toBe('Informativa')
  })

  it('lida remove Atenção/Nova', () => {
    const readAt = new Date().toISOString()
    expect(notificationPriorityBadge(base({ readAt }))).toBe('Informativa')
    expect(notificationPriorityBadgeVisible(base({ readAt }))).toBeNull()
    expect(
      notificationPriorityBadge(
        base({
          kind: 'order_awaiting_decision',
          severity: 'acao_necessaria',
          actionable: true,
          readAt,
        }),
      ),
    ).toBe('Informativa')
  })

  it('meta com categoria', () => {
    expect(notificationMetaLine(base())).toMatch(/Pagamentos/)
  })

  it('selo visível omite Informativa', () => {
    expect(notificationPriorityBadgeVisible(base())).toBe('Atenção')
    expect(
      notificationPriorityBadgeVisible(
        base({
          severity: 'informativa',
          kind: 'order_received',
          actionable: false,
          readAt: new Date().toISOString(),
        }),
      ),
    ).toBeNull()
  })

  it('ordena ação e não lidas primeiro', () => {
    const sorted = sortNotificationsForInbox([
      base({
        id: 'old',
        kind: 'order_received',
        severity: 'informativa',
        actionable: false,
        readAt: new Date().toISOString(),
        createdAt: '2026-01-01T10:00:00.000Z',
      }),
      base({
        id: 'act',
        kind: 'order_awaiting_decision',
        severity: 'acao_necessaria',
        actionable: true,
        readAt: null,
        createdAt: '2026-01-01T09:00:00.000Z',
      }),
    ])
    expect(sorted.map((n) => n.id)).toEqual(['act', 'old'])
  })
})
