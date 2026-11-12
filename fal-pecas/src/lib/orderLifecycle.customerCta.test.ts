import { describe, expect, it } from 'vitest'
import { customerOrderListCta } from './orderLifecycle'

describe('customerOrderListCta', () => {
  it('prioriza pagamento e decisão', () => {
    expect(customerOrderListCta('aguardando_pagamento')).toBe('Continuar pagamento →')
    expect(customerOrderListCta('aguardando_decisao')).toBe('Responder loja →')
  })

  it('sinaliza retirada liberada', () => {
    expect(
      customerOrderListCta('enviado', { pickup: true, pickupAuthorized: true }),
    ).toBe('Pronto para retirar →')
    expect(
      customerOrderListCta('pronto_para_envio', { pickup: true, pickupAuthorized: true }),
    ).toBe('Pronto para retirar →')
  })

  it('frete em trânsito sem retirada', () => {
    expect(customerOrderListCta('enviado', { pickup: false })).toBe('Acompanhar envio →')
    expect(customerOrderListCta('enviado', { pickup: true, pickupAuthorized: false })).toBe(
      null,
    )
  })
})
