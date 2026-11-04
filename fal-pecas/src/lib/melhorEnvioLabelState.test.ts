import { describe, expect, it } from 'vitest'
import {
  alreadyGenerated,
  alreadyPurchased,
  canPurchaseLabel,
  evaluateFreightDivergence,
  meLabelState,
  mergeMeMetadata,
  parseMeMeta,
} from './melhorEnvioLabelState'

describe('melhorEnvioLabelState', () => {
  it('parseMeMeta lê metadata.me', () => {
    expect(parseMeMeta({ me: { label_state: 'purchased', protocol: 'X' } }).protocol).toBe('X')
    expect(meLabelState(null)).toBe('none')
    expect(meLabelState({ me: { label_state: 'printed' } })).toBe('printed')
  })

  it('canPurchaseLabel só em pronto_para_envio e estados iniciais', () => {
    expect(canPurchaseLabel('pronto_para_envio', 'none')).toBe(true)
    expect(canPurchaseLabel('pronto_para_envio', 'quoted')).toBe(true)
    expect(canPurchaseLabel('pronto_para_envio', 'purchased')).toBe(false)
    expect(canPurchaseLabel('em_analise', 'none')).toBe(false)
    expect(canPurchaseLabel('enviado', 'printed')).toBe(false)
  })

  it('idempotência purchased/generated', () => {
    expect(alreadyPurchased('purchased')).toBe(true)
    expect(alreadyPurchased('printed')).toBe(true)
    expect(alreadyPurchased('cart')).toBe(false)
    expect(alreadyGenerated('generated')).toBe(true)
    expect(alreadyGenerated('purchased')).toBe(false)
  })

  it('evaluateFreightDivergence bloqueia diferença e serviço indisponível', () => {
    const ok = evaluateFreightDivergence({
      chargedShipping: 29.9,
      labelAmount: 29.9,
    })
    expect(ok.blocked).toBe(false)

    const bad = evaluateFreightDivergence({
      chargedShipping: 29.9,
      labelAmount: 45,
    })
    expect(bad.blocked).toBe(true)
    expect(bad.reason).toMatch(/bloqueada/i)

    const unavailable = evaluateFreightDivergence({
      chargedShipping: 29.9,
      labelAmount: 29.9,
      serviceAvailable: false,
    })
    expect(unavailable.blocked).toBe(true)
  })

  it('mergeMeMetadata preserva campos anteriores', () => {
    const next = mergeMeMetadata({ me: { label_state: 'quoted', quoted_amount: 10 } }, {
      label_state: 'cart',
      cart_item_id: 'c1',
    })
    const me = parseMeMeta(next)
    expect(me.label_state).toBe('cart')
    expect(me.quoted_amount).toBe(10)
    expect(me.cart_item_id).toBe('c1')
  })
})
