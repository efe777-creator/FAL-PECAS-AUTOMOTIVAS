import { formatPlateMask } from '@/services/plates/plateNormalize'
import type { CustomerSavedVehicle } from '@/types'

export function vehicleDisplayName(v: CustomerSavedVehicle): string {
  const nick = v.nickname?.trim()
  if (nick) return nick
  const pair = `${v.makerName ?? ''} ${v.modelName ?? ''}`.trim()
  return pair || 'Veículo'
}

export function vehicleTechLine(v: CustomerSavedVehicle): string {
  return [v.makerName, v.modelName, v.year, v.engine, v.versionName].filter(Boolean).join(' · ')
}

export function vehiclePlateLabel(v: CustomerSavedVehicle): string | null {
  if (!v.plate?.trim()) return null
  return formatPlateMask(v.plate)
}

export function isVehicleIncomplete(v: CustomerSavedVehicle): boolean {
  return !v.versionId
}

export function vehicleCatalogHref(v: CustomerSavedVehicle): string {
  const q = new URLSearchParams()
  if (v.makerName) q.set('maker', v.makerName)
  if (v.modelName) q.set('model', v.modelName)
  if (v.year) q.set('year', String(v.year))
  if (v.engine) q.set('engine', v.engine)
  if (v.versionName) q.set('version', v.versionName)
  const qs = q.toString()
  return qs ? `/catalogo?${qs}` : '/catalogo'
}
