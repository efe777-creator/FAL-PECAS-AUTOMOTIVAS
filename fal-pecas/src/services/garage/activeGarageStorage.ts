import type { CustomerSavedVehicle, VehicleFilter } from '@/types'

export const ACTIVE_GARAGE_KEY_PREFIX = 'fal_active_garage_vehicle:'

export type ActiveGarageStored = {
  customerVehicleId: string
  filter: VehicleFilter
  updatedAt: string
}

export function activeGarageStorageKey(userId: string): string {
  return `${ACTIVE_GARAGE_KEY_PREFIX}${userId}`
}

export function vehicleToActiveFilter(v: CustomerSavedVehicle): VehicleFilter {
  return {
    maker: v.makerName || undefined,
    model: v.modelName || undefined,
    year: v.year != null ? String(v.year) : undefined,
    engine: v.engine || undefined,
    version: v.versionName || undefined,
    manufacturerId: v.manufacturerId || undefined,
    modelId: v.modelId || undefined,
    versionId: v.versionId || undefined,
    plate: v.plate || undefined,
  }
}

export function readActiveGarage(userId: string): ActiveGarageStored | null {
  if (typeof localStorage === 'undefined' || !userId) return null
  try {
    const raw = localStorage.getItem(activeGarageStorageKey(userId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as ActiveGarageStored
    if (!parsed?.customerVehicleId || typeof parsed.customerVehicleId !== 'string') return null
    return {
      customerVehicleId: parsed.customerVehicleId,
      filter: parsed.filter && typeof parsed.filter === 'object' ? parsed.filter : {},
      updatedAt: parsed.updatedAt || new Date().toISOString(),
    }
  } catch {
    return null
  }
}

export function writeActiveGarage(userId: string, payload: ActiveGarageStored): void {
  if (typeof localStorage === 'undefined' || !userId) return
  localStorage.setItem(activeGarageStorageKey(userId), JSON.stringify(payload))
}

export function clearActiveGarage(userId: string): void {
  if (typeof localStorage === 'undefined' || !userId) return
  localStorage.removeItem(activeGarageStorageKey(userId))
}

/**
 * Valida o id ativo contra a lista da garagem.
 * Inválido → principal (se houver); senão null (limpar).
 */
export function resolveActiveAgainstGarage(
  storedId: string | null | undefined,
  vehicles: CustomerSavedVehicle[],
): CustomerSavedVehicle | null {
  if (!vehicles.length) return null
  if (storedId) {
    const hit = vehicles.find((v) => v.id === storedId)
    if (hit) return hit
  }
  return vehicles.find((v) => v.isPrimary) ?? null
}
