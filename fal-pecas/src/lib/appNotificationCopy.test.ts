import { describe, expect, it } from 'vitest'
import {
  appNotificationCopy,
  appNotificationHref,
  isActionableNotificationKind,
  notificationNeedsAction,
  resolveNotificationNavHref,
} from './appNotificationCopy'

describe('appNotificationCopy', () => {
  it('retirada: autorizado / shipped / delivered', () => {
    expect(appNotificationCopy('pickup_authorized')?.title).toBe('Pronto para retirar na loja')
    expect(appNotificationCopy('order_shipped', { pickup: true })?.title).toBe('Pronto para retirar')
    expect(appNotificationCopy('order_delivered', { pickup: true })?.title).toBe('Retirada feita')
  })

  it('frete: shipped genérico', () => {
    expect(appNotificationCopy('order_shipped', { pickup: false })?.title).toBe('Pedido enviado')
  })

  it('status e decisão', () => {
    expect(appNotificationCopy('payment_approved')?.title).toBe('Pagamento aprovado')
    expect(appNotificationCopy('order_awaiting_decision')?.title).toMatch(/a[cç][aã]o necess[aá]ria/i)
    expect(appNotificationCopy('customer_chose_continue_available')?.title).toBeTruthy()
    expect(appNotificationCopy('staff_held_for_availability')?.title).toBeTruthy()
  })

  it('href por audience', () => {
    expect(appNotificationHref('abc', 'customer')).toBe('/conta/pedidos/abc')
    expect(appNotificationHref('abc', 'staff')).toBe('/admin/pedidos/abc')
  })

  it('ação necessária e âncora #decisao', () => {
    expect(isActionableNotificationKind('staff_requested_customer_decision', 'customer')).toBe(true)
    expect(isActionableNotificationKind('payment_approved', 'customer')).toBe(false)
    expect(isActionableNotificationKind('cancellation_requested', 'staff')).toBe(true)
    expect(
      notificationNeedsAction({
        kind: 'payment_approved',
        audience: 'customer',
        actionable: true,
      }),
    ).toBe(true)
    expect(
      notificationNeedsAction({
        kind: 'order_awaiting_decision',
        audience: 'customer',
        actionable: false,
      }),
    ).toBe(false)
    expect(
      resolveNotificationNavHref({
        href: '/conta/pedidos/abc',
        kind: 'order_awaiting_decision',
        audience: 'customer',
      }),
    ).toBe('/conta/pedidos/abc#decisao')
    expect(
      resolveNotificationNavHref({
        href: '/admin/pedidos/abc',
        kind: 'cancellation_requested',
        audience: 'staff',
      }),
    ).toBe('/admin/pedidos/abc')
  })
})
