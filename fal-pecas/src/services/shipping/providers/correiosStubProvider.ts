import type { ShippingProvider, ShippingQuoteOption, ShippingQuoteRequest } from '@/types'

function digits(cep: string): string {
  return cep.replace(/\D/g, '')
}

/**
 * F9-A — Correios em modo sandbox (sem chamada HTTP real).
 * Cotação determinística PAC/SEDEX a partir do CEP destino.
 * Quando houver credenciais reais, evoluir este provider para API Correios
 * mantendo o mesmo contrato `ShippingProvider`.
 */
export const correiosSandboxProvider: ShippingProvider = {
  async quote(req: ShippingQuoteRequest): Promise<ShippingQuoteOption[]> {
    const cep = digits(req.postalCode)
    if (cep.length !== 8) {
      throw new Error('CEP inválido para cotação Correios (sandbox)')
    }

    const region = Number(cep[0] ?? '0')
    const weightHint = Math.max(
      0.3,
      (req.items ?? []).reduce((acc, it) => acc + (it.quantity ?? 1) * 0.2, 0),
    )

    const pacBase = 22.5 + region * 1.8 + weightHint * 4.5
    const sedexBase = 38.9 + region * 2.4 + weightHint * 6.2

    const options: ShippingQuoteOption[] = [
      {
        id: 'correios:pac',
        provider: 'correios',
        serviceCode: 'PAC',
        label: 'Correios PAC (sandbox)',
        amount: Math.round(pacBase * 100) / 100,
        etaDaysMin: 5 + Math.min(region, 4),
        etaDaysMax: 10 + Math.min(region, 4),
        metadata: { mode: 'sandbox', service: 'PAC', cep },
      },
      {
        id: 'correios:sedex',
        provider: 'correios',
        serviceCode: 'SEDEX',
        label: 'Correios SEDEX (sandbox)',
        amount: Math.round(sedexBase * 100) / 100,
        etaDaysMin: 2 + Math.min(region, 2),
        etaDaysMax: 4 + Math.min(region, 3),
        metadata: { mode: 'sandbox', service: 'SEDEX', cep },
      },
    ]

    return options
  },
}

/** @deprecated use correiosSandboxProvider — mantido para imports antigos do stub */
export const correiosStubProvider = correiosSandboxProvider
