import { describe, expect, it } from 'vitest'
import {
  commercialShippingDisclaimer,
  getCarrierByEnvKey,
  listCarriers,
  resolveCarrierProvider,
} from '@/services/shipping/carrierRegistry'
import {
  buildOkEnvelope,
  fingerprintQuoteRequest,
  logisticsGaps,
} from '@/services/shipping/shippingQuoteContract'
import { quoteShippingEnvelope } from '@/services/shipping/quoteShippingEnvelope'

const baseReq = {
  postalCode: '01310100',
  state: 'SP',
  city: 'São Paulo',
  subtotal: 100,
  itemCount: 1,
  originPostalCode: '01001000',
  items: [{ productId: 'p1', quantity: 1, weightKg: 0.5 }],
}

describe('carrierRegistry', () => {
  it('lista carriers habilitados sem o stub carrier', () => {
    const ids = listCarriers().map((c) => c.id)
    expect(ids).toContain('mock')
    expect(ids).toContain('correios')
    expect(ids).toContain('frenet')
    expect(ids).not.toContain('carrier')
  })

  it('includeDisabled expõe slot transportadora futura', () => {
    const carrier = listCarriers({ includeDisabled: true }).find((c) => c.id === 'carrier')
    expect(carrier?.mode).toBe('stub')
    expect(carrier?.enabled).toBe(false)
  })

  it('só mock está placeOrderReady', () => {
    const ready = listCarriers({ includeDisabled: true }).filter((c) => c.placeOrderReady)
    expect(ready.map((c) => c.id)).toEqual(['mock'])
  })

  it('resolve env desconhecido para mock', () => {
    expect(getCarrierByEnvKey('xyz').id).toBe('mock')
    expect(getCarrierByEnvKey('correios').id).toBe('correios')
  })

  it('disclaimer honesto para sandbox/mock', () => {
    expect(commercialShippingDisclaimer(getCarrierByEnvKey('mock'))).toMatch(/mock/i)
    expect(commercialShippingDisclaimer(getCarrierByEnvKey('correios'))).toMatch(/sandbox/i)
  })

  it('provider correios sandbox cotação PAC/SEDEX', async () => {
    const opts = await resolveCarrierProvider('correios').quote(baseReq)
    expect(opts.some((o) => o.id === 'correios:pac')).toBe(true)
    expect(opts.every((o) => o.provider === 'correios')).toBe(true)
  })
})

describe('shippingQuoteContract + envelope', () => {
  it('fingerprint estável', () => {
    expect(fingerprintQuoteRequest(baseReq)).toBe(fingerprintQuoteRequest({ ...baseReq }))
  })

  it('logisticsGaps detecta peso ausente', () => {
    expect(
      logisticsGaps({
        ...baseReq,
        items: [{ productId: 'p1', quantity: 1 }],
      }),
    ).toContain('peso_ausente:p1')
  })

  it('buildOkEnvelope inclui expiresAt', () => {
    const env = buildOkEnvelope({
      providerId: 'mock',
      mode: 'mock',
      options: [
        {
          id: 'mock:economic',
          provider: 'mock',
          serviceCode: 'economic',
          label: 'Eco',
          amount: 29.9,
        },
      ],
      req: baseReq,
    })
    expect(env.status).toBe('ok')
    expect(env.expiresAt).toBeTruthy()
  })

  it('quoteShippingEnvelope mock retorna ok + disclaimer', async () => {
    const env = await quoteShippingEnvelope(baseReq, 'mock')
    expect(env.status).toBe('ok')
    expect(env.options.length).toBeGreaterThan(0)
    expect(env.disclaimer).toMatch(/homologação|mock/i)
  })

  it('quoteShippingEnvelope CEP inválido', async () => {
    const env = await quoteShippingEnvelope({ ...baseReq, postalCode: '123' }, 'correios')
    expect(env.status).toBe('invalid_cep')
    expect(env.options).toHaveLength(0)
  })
})
