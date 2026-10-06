import { frenetSandboxProvider } from '@/services/shipping/providers/frenetStubProvider'
import type { ShippingQuoteRequest } from '@/types'
import { describe, expect, it } from 'vitest'

const baseReq: ShippingQuoteRequest = {
  postalCode: '01310-100',
  state: 'SP',
  city: 'São Paulo',
  subtotal: 100,
  itemCount: 2,
}

describe('frenetSandboxProvider (F9-B)', () => {
  it('retorna opções multi-transportadora para CEP válido', async () => {
    const opts = await frenetSandboxProvider.quote(baseReq)
    expect(opts).toHaveLength(3)
    expect(opts.every((o) => o.provider === 'frenet')).toBe(true)
    expect(opts.every((o) => o.amount > 0)).toBe(true)
    expect(opts.every((o) => o.metadata?.mode === 'sandbox')).toBe(true)
    expect(opts.every((o) => o.metadata?.aggregator === 'frenet')).toBe(true)
    expect(opts.map((o) => o.serviceCode).sort()).toEqual([
      'CORREIOS.PAC',
      'JADLOG.PACKAGE',
      'TOTAL.EXPRESS',
    ])
  })

  it('rejeita CEP inválido', async () => {
    await expect(
      frenetSandboxProvider.quote({ ...baseReq, postalCode: '12' }),
    ).rejects.toThrow(/CEP/)
  })
})
