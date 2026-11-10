import { resolveOwnQuoteOptions } from '@/services/shipping/own/ownQuoteOptions'
import { createStorePickupOption } from '@/services/shipping/storePickupOption'
import type { ShippingProvider, ShippingQuoteOption, ShippingQuoteRequest } from '@/types'

function regionSurcharge(postalCode: string): number {
  const digits = postalCode.replace(/\D/g, '')
  const first = digits[0] ?? '0'
  if ('0123'.includes(first)) return 0
  if ('456'.includes(first)) return 5
  return 10
}

/** Provider mock F6 — espelha `resolve_mock_shipping_option` no SQL (+ frete próprio v1/v2). */
export const mockShippingProvider: ShippingProvider = {
  async quote(req: ShippingQuoteRequest): Promise<ShippingQuoteOption[]> {
    const surcharge = regionSurcharge(req.postalCode)
    const options: ShippingQuoteOption[] = []

    const own = await resolveOwnQuoteOptions(req)
    options.push(...own)

    options.push(
      {
        id: 'mock:economic',
        provider: 'mock',
        serviceCode: 'economic',
        label: 'Entrega econômica',
        amount: 29.9 + surcharge,
        etaDaysMin: 5,
        etaDaysMax: 8,
        metadata: { kind: 'mock_table' },
      },
      {
        id: 'mock:express',
        provider: 'mock',
        serviceCode: 'express',
        label: 'Entrega expressa',
        amount: 49.9 + surcharge,
        etaDaysMin: 2,
        etaDaysMax: 4,
        metadata: { kind: 'carrier_ready' },
      },
      createStorePickupOption(),
    )

    return options
  },
}
