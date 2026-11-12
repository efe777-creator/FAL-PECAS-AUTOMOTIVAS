import { DEFAULT_SHIPPING_ETA_POLICY } from '@/lib/shippingEtaPolicy'
import { getShippingEtaPolicy } from '@/services/admin/adminShippingEtaPolicyService'
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

/** Provider mock F6 — prazos mock/retirada vêm da Logística (Marcha 1b). */
export const mockShippingProvider: ShippingProvider = {
  async quote(req: ShippingQuoteRequest): Promise<ShippingQuoteOption[]> {
    const surcharge = regionSurcharge(req.postalCode)
    const options: ShippingQuoteOption[] = []

    const own = await resolveOwnQuoteOptions(req)
    options.push(...own)

    let eta = DEFAULT_SHIPPING_ETA_POLICY
    try {
      eta = await getShippingEtaPolicy()
    } catch {
      /* fallback defaults — tabela pode não existir até migrate */
    }

    options.push(
      {
        id: 'mock:economic',
        provider: 'mock',
        serviceCode: 'economic',
        label: 'Entrega econômica',
        amount: 29.9 + surcharge,
        etaDaysMin: eta.mock.economicMin,
        etaDaysMax: Math.max(eta.mock.economicMin, eta.mock.economicMax),
        metadata: { kind: 'mock_table' },
      },
      {
        id: 'mock:express',
        provider: 'mock',
        serviceCode: 'express',
        label: 'Entrega expressa',
        amount: 49.9 + surcharge,
        etaDaysMin: eta.mock.expressMin,
        etaDaysMax: Math.max(eta.mock.expressMin, eta.mock.expressMax),
        metadata: { kind: 'carrier_ready' },
      },
      createStorePickupOption({
        min: eta.pickup.availableInDaysMin,
        max: eta.pickup.availableInDaysMax,
      }),
    )

    return options
  },
}
