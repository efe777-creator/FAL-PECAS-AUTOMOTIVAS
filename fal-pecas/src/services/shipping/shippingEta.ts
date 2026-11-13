import { isStorePickupOption } from '@/services/shipping/storePickupOption'
import type { ShippingQuoteOption } from '@/types'

/** Prazo legível na vitrine/checkout: Retirada | N–M dias úteis | vazio. */
export function formatShippingEtaLabel(option: ShippingQuoteOption): string {
  if (isStorePickupOption(option)) return 'Retirada'
  if (option.etaDaysMin != null && option.etaDaysMax != null) {
    if (option.etaDaysMin === 0 && option.etaDaysMax === 0) return 'Retirada'
    if (option.etaDaysMin === option.etaDaysMax) {
      return `${option.etaDaysMin} ${option.etaDaysMin === 1 ? 'dia útil' : 'dias úteis'}`
    }
    return `${option.etaDaysMin}–${option.etaDaysMax} dias úteis`
  }
  if (option.etaDaysMin != null || option.etaDaysMax != null) {
    const n = option.etaDaysMin ?? option.etaDaysMax!
    if (n === 0) return 'Retirada'
    return `${n} ${n === 1 ? 'dia útil' : 'dias úteis'}`
  }
  return ''
}
