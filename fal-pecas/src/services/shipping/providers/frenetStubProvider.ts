import type { ShippingProvider, ShippingQuoteOption, ShippingQuoteRequest } from '@/types'

function digits(cep: string): string {
  return cep.replace(/\D/g, '')
}

/**
 * F9-B — Frenet/agregador em modo sandbox (sem chamada HTTP real).
 * Retorna cotações multi-transportadora determinísticas a partir do CEP.
 * Credenciais reais / Edge Function ficam para evolução posterior —
 * nunca embutir token Frenet no frontend.
 */
export const frenetSandboxProvider: ShippingProvider = {
  async quote(req: ShippingQuoteRequest): Promise<ShippingQuoteOption[]> {
    const cep = digits(req.postalCode)
    if (cep.length !== 8) {
      throw new Error('CEP inválido para cotação Frenet')
    }

    const region = Number(cep[0] ?? '0')
    const weightHint = Math.max(
      0.3,
      req.totalWeightKg ??
        (req.items ?? []).reduce((acc, it) => acc + (it.quantity ?? 1) * (it.weightKg ?? 0.2), 0),
    )
    const volumeHint = Math.max(1, req.itemCount || 1)

    const jadlog = 19.9 + region * 1.5 + weightHint * 3.8 + volumeHint * 0.4
    const correiosVia = 24.5 + region * 1.9 + weightHint * 4.2
    const totalExpress = 42.0 + region * 2.6 + weightHint * 5.5

    const options: ShippingQuoteOption[] = [
      {
        id: 'frenet:jadlog.package',
        provider: 'frenet',
        serviceCode: 'JADLOG.PACKAGE',
        label: 'Jadlog Package',
        amount: Math.round(jadlog * 100) / 100,
        etaDaysMin: 4 + Math.min(region, 3),
        etaDaysMax: 8 + Math.min(region, 4),
        metadata: { mode: 'sandbox', aggregator: 'frenet', carrier: 'jadlog', cep },
      },
      {
        id: 'frenet:correios.pac',
        provider: 'frenet',
        serviceCode: 'CORREIOS.PAC',
        label: 'Correios PAC',
        amount: Math.round(correiosVia * 100) / 100,
        etaDaysMin: 5 + Math.min(region, 4),
        etaDaysMax: 10 + Math.min(region, 4),
        metadata: { mode: 'sandbox', aggregator: 'frenet', carrier: 'correios', cep },
      },
      {
        id: 'frenet:total.express',
        provider: 'frenet',
        serviceCode: 'TOTAL.EXPRESS',
        label: 'Total Express',
        amount: Math.round(totalExpress * 100) / 100,
        etaDaysMin: 1 + Math.min(region, 2),
        etaDaysMax: 3 + Math.min(region, 2),
        metadata: { mode: 'sandbox', aggregator: 'frenet', carrier: 'total_express', cep },
      },
    ]

    return options
  },
}

/** @deprecated use frenetSandboxProvider — mantido para imports antigos do stub */
export const frenetStubProvider = frenetSandboxProvider
