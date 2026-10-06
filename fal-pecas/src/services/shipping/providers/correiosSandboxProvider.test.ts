import { correiosSandboxProvider } from '@/services/shipping/providers/correiosStubProvider'
import type { ShippingQuoteRequest } from '@/types'
import { describe, expect, it } from 'vitest'

const baseReq: ShippingQuoteRequest = {
  postalCode: '01310-100',
  state: 'SP',
  city: 'São Paulo',
  subtotal: 100,
  itemCount: 1,
}

describe('correiosSandboxProvider (F9-A)', () => {
  it('retorna PAC e SEDEX para CEP válido', async () => {
    const opts = await correiosSandboxProvider.quote(baseReq)
    expect(opts).toHaveLength(2)
    expect(opts.map((o) => o.serviceCode).sort()).toEqual(['PAC', 'SEDEX'])
    expect(opts.every((o) => o.provider === 'correios')).toBe(true)
    expect(opts.every((o) => o.amount > 0)).toBe(true)
    expect(opts[0]?.metadata?.mode).toBe('sandbox')
  })

  it('rejeita CEP inválido', async () => {
    await expect(
      correiosSandboxProvider.quote({ ...baseReq, postalCode: '123' }),
    ).rejects.toThrow(/CEP/)
  })
})
