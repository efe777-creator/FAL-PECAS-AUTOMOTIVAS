import { OWN_VEHICLE_ICON_OPTIONS, type OwnDeliveryRate } from '@/services/admin/adminOwnDeliveryService'
import type { OwnPricingMode } from '@/types'

export function iconLabel(icon: string): string {
  return OWN_VEHICLE_ICON_OPTIONS.find((o) => o.value === icon)?.label ?? icon
}

/** Gera ID interno da opção flat; operador não edita. */
export function ensureOwnRateId(label: string, existing?: string): string {
  if (existing?.startsWith('own:') && existing.length > 4) return existing
  const slug = label
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 32)
  return `own:${slug || 'fal'}`
}

export function pricingModeLabel(mode: OwnPricingMode): string {
  return mode === 'distance_vehicle' ? 'por distância e veículo' : 'preço fixo'
}

export function normalizeFlatRates(
  rates: OwnDeliveryRate[],
  etaDaysMin: number,
  etaDaysMax: number,
): OwnDeliveryRate[] {
  return rates.map((r, i) => ({
    ...r,
    id: ensureOwnRateId(r.label, r.id),
    serviceCode: r.serviceCode?.trim() || 'fal_sp',
    etaDaysMin: r.etaDaysMin || etaDaysMin,
    etaDaysMax: r.etaDaysMax || etaDaysMax,
    label: r.label.trim() || `Opção ${i + 1}`,
  }))
}
