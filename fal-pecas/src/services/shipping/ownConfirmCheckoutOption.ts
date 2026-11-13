import type { ShippingQuoteOption } from '@/types'

export const OWN_CONFIRM_CHECKOUT_OPTION_ID = 'own:confirm_checkout'

export function isOwnConfirmCheckoutOption(
  option: Pick<ShippingQuoteOption, 'id' | 'serviceCode' | 'metadata'> | null | undefined,
): boolean {
  if (!option) return false
  if (option.id === OWN_CONFIRM_CHECKOUT_OPTION_ID) return true
  if (option.serviceCode === 'own_confirm_checkout') return true
  if (option.metadata?.kind === 'own_confirm_checkout') return true
  return false
}

/** Placeholder cotável na PDP (só CEP): preço/prazo definitivos no checkout com nº. */
export function createOwnConfirmCheckoutOption(eta?: {
  min?: number
  max?: number
}): ShippingQuoteOption {
  const min = eta?.min ?? 1
  const max = Math.max(min, eta?.max ?? 3)
  return {
    id: OWN_CONFIRM_CHECKOUT_OPTION_ID,
    provider: 'own',
    serviceCode: 'own_confirm_checkout',
    label: 'Entrega FAL',
    amount: 0,
    etaDaysMin: min,
    etaDaysMax: max,
    metadata: { kind: 'own_confirm_checkout', provisional: true },
  }
}

export function isPricedOwnDeliveryOption(option: ShippingQuoteOption): boolean {
  if (option.provider !== 'own') return false
  if (option.id === 'own:needs_number' || option.serviceCode === 'needs_number') return false
  if (option.id === 'own:manual_review' || option.serviceCode === 'manual_review') return false
  if (isOwnConfirmCheckoutOption(option)) return false
  return true
}
