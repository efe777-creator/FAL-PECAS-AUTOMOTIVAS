import { formatPlateMask, normalizePlate } from '@/services/plates/plateNormalize'
import type { CustomerSavedVehicle, VehicleFilter } from '@/types'

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

/**
 * Casa filtro de placa/catálogo com veículo salvo (placa primeiro, depois maker+model+ano).
 * Usado para alinhar “ativo” ao contexto de navegação e evitar snapshot errado no carrinho.
 */
export function matchSavedVehicleForFilter(
  vehicles: readonly CustomerSavedVehicle[],
  filter: VehicleFilter | null | undefined,
): CustomerSavedVehicle | null {
  if (!filter?.maker?.trim() || !filter?.model?.trim() || !vehicles.length) return null
  const plateNorm = normalizePlate(filter.plate ?? '')
  if (plateNorm) {
    const byPlate = vehicles.find((v) => normalizePlate(v.plate ?? '') === plateNorm)
    if (byPlate) return byPlate
  }
  const maker = filter.maker.trim().toLowerCase()
  const model = filter.model.trim().toLowerCase()
  const year = filter.year?.trim() ? String(Number(filter.year)) : null
  return (
    vehicles.find((v) => {
      const vm = (v.makerName ?? '').trim().toLowerCase()
      const vd = (v.modelName ?? '').trim().toLowerCase()
      if (vm !== maker || vd !== model) return false
      if (year && v.year != null && String(v.year) !== year) return false
      return true
    }) ?? null
  )
}
