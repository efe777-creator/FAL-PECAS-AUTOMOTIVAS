import { describe, expect, it } from 'vitest'
import { evaluateShipOrderGates, customerFacingShipCopy } from './meLabelShipGates'

describe('meLabelShipGates (Marcha 5 — label ≠ postagem)', () => {
  it('ME: printed/purchased NÃO implica enviado — ship exige status + pay + packing + label comprada', () => {
    expect(
      evaluateShipOrderGates({
        orderStatus: 'pronto_para_envio',
        paymentStatus: 'approved',
        packingComplete: true,
        provider: 'melhorenvio',
        labelState: 'printed',
      }).ok,
    ).toBe(true)

    expect(
      evaluateShipOrderGates({
        orderStatus: 'pronto_para_envio',
        paymentStatus: 'approved',
        packingComplete: true,
        provider: 'melhorenvio',
        labelState: 'cart',
      }).ok,
    ).toBe(false)

    expect(
      evaluateShipOrderGates({
        orderStatus: 'pronto_para_envio',
        paymentStatus: 'pending',
        packingComplete: true,
        provider: 'melhorenvio',
        labelState: 'purchased',
      }).blockers,
    ).toContain('payment_not_approved')
  })

  it('Own: não exige label ME nem packing; ME exige packing', () => {
    expect(
      evaluateShipOrderGates({
        orderStatus: 'pronto_para_envio',
        paymentStatus: 'approved',
        packingComplete: false,
        provider: 'own',
        labelState: 'none',
      }).ok,
    ).toBe(true)

    expect(
      evaluateShipOrderGates({
        orderStatus: 'pronto_para_envio',
        paymentStatus: 'approved',
        packingComplete: false,
        provider: 'melhorenvio',
        labelState: 'printed',
      }).blockers,
    ).toContain('packing_incomplete')
  })

  it('copy cliente: pronto_para_envio ≠ enviado mesmo com etiqueta impressa', () => {
    expect(customerFacingShipCopy('pronto_para_envio', 'printed')).toMatch(/postagem|prepar/i)
    expect(customerFacingShipCopy('pronto_para_envio', 'printed')).not.toMatch(/^enviado$/i)
    expect(customerFacingShipCopy('enviado', 'printed')).toMatch(/enviado/i)
  })
})
