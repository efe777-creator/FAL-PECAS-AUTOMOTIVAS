import { describe, expect, it } from 'vitest'
import { appNotificationCopy, appNotificationHref } from './appNotificationCopy'

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
    expect(appNotificationCopy('order_awaiting_decision')?.title).toMatch(/decis[aã]o|autoriza/i)
    expect(appNotificationCopy('customer_chose_continue_available')?.title).toBeTruthy()
    expect(appNotificationCopy('staff_held_for_availability')?.title).toBeTruthy()
  })

  it('href por audience', () => {
    expect(appNotificationHref('abc', 'customer')).toBe('/conta/pedidos/abc')
    expect(appNotificationHref('abc', 'staff')).toBe('/admin/pedidos/abc')
  })
})
