import { describe, expect, it } from 'vitest'
import {
  evaluateMePurchaseGates,
  resolveFreightDivergenceForPurchase,
} from './meLabelPurchaseGates'

const base = {
  orderStatus: 'pronto_para_envio',
  labelState: 'cart' as const,
  paymentStatus: 'approved',
  packingComplete: true,
  orderCancelledOrRefunded: false,
}

describe('meLabelPurchaseGates (Marcha 4)', () => {
  it('PASS: status + paid + packing + label pré-purchase', () => {
    const g = evaluateMePurchaseGates(base)
    expect(g.ok).toBe(true)
    expect(g.blockers).toEqual([])
  })

  it('STOP: payment pending', () => {
    const g = evaluateMePurchaseGates({ ...base, paymentStatus: 'pending' })
    expect(g.ok).toBe(false)
    expect(g.blockers).toContain('payment_not_approved')
  })

  it('STOP: packing incompleto', () => {
    const g = evaluateMePurchaseGates({ ...base, packingComplete: false })
    expect(g.ok).toBe(false)
    expect(g.blockers).toContain('packing_incomplete')
  })

  it('STOP: pedido cancelado/reembolsado', () => {
    const g = evaluateMePurchaseGates({ ...base, orderCancelledOrRefunded: true })
    expect(g.ok).toBe(false)
    expect(g.blockers).toContain('order_not_operable')
  })

  it('STOP: status não expedível', () => {
    const g = evaluateMePurchaseGates({ ...base, orderStatus: 'em_separacao' })
    expect(g.ok).toBe(false)
    expect(g.blockers).toContain('order_not_ready')
  })

  it('idempotente: já purchased → ok com already_purchased', () => {
    const g = evaluateMePurchaseGates({ ...base, labelState: 'purchased' })
    expect(g.ok).toBe(true)
    expect(g.alreadyPurchased).toBe(true)
  })

  it('divergência bloqueia sem override', () => {
    const d = resolveFreightDivergenceForPurchase({
      chargedShipping: 20,
      labelAmount: 35,
      override: null,
    })
    expect(d.blocked).toBe(true)
    expect(d.overrideApplied).toBe(false)
  })

  it('divergência com override justificado libera', () => {
    const d = resolveFreightDivergenceForPurchase({
      chargedShipping: 20,
      labelAmount: 35,
      override: { confirm: true, reason: 'Cliente aceitou diferença — ticket #99' },
    })
    expect(d.blocked).toBe(false)
    expect(d.overrideApplied).toBe(true)
  })

  it('override sem reason → ainda bloqueado', () => {
    const d = resolveFreightDivergenceForPurchase({
      chargedShipping: 20,
      labelAmount: 35,
      override: { confirm: true, reason: '  ' },
    })
    expect(d.blocked).toBe(true)
  })
})
