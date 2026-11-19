import type { CustomerSavedVehicle, VehicleFilter } from '@/types'

export const ACTIVE_GARAGE_KEY_PREFIX = 'fal_active_garage_vehicle:'
/** Storage de compatibilidade de sessão sem login (selos); salvar na garagem exige auth. */
export const GUEST_ACTIVE_GARAGE_ID = 'guest'

export type ActiveGarageMode = 'vehicle' | 'session' | 'cleared'

export type ActiveGarageStored = {
  mode: ActiveGarageMode
  /** Preenchido só em mode=vehicle. */
  customerVehicleId: string | null
  filter: VehicleFilter
  updatedAt: string
}

export type ResolvedActiveGarage = {
  mode: ActiveGarageMode | 'none'
  vehicle: CustomerSavedVehicle | null
  filter: VehicleFilter | null
}

export function activeGarageStorageKey(userId: string): string {
  return `${ACTIVE_GARAGE_KEY_PREFIX}${userId}`
}

/** userId autenticado ou chave guest para filtro de sessão anônimo. */
export function resolveActiveGarageStorageId(userId: string | null | undefined): string {
  return userId?.trim() ? userId : GUEST_ACTIVE_GARAGE_ID
}

/**
 * Após login: promove filtro de sessão guest → user (se user ainda não tem preferência)
 * e limpa a chave guest.
 */
export function promoteGuestSessionToUser(userId: string): ActiveGarageStored | null {
  if (!userId || userId === GUEST_ACTIVE_GARAGE_ID) return null
  const guest = readActiveGarage(GUEST_ACTIVE_GARAGE_ID)
  clearActiveGarage(GUEST_ACTIVE_GARAGE_ID)
  if (!guest || guest.mode !== 'session') return null
  const filter = guest.filter && Object.keys(guest.filter).length ? guest.filter : null
  if (!filter) return null
  const existing = readActiveGarage(userId)
  if (existing?.mode === 'vehicle' || existing?.mode === 'session' || existing?.mode === 'cleared') {
    return null
  }
  writeSessionActiveGarage(userId, filter)
  return readActiveGarage(userId)
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

export function filterDisplayLabel(filter: VehicleFilter | null | undefined): string {
  if (!filter) return 'Veículo'
  const pair = `${filter.maker ?? ''} ${filter.model ?? ''}`.trim()
  if (!pair) return 'Veículo'
  return filter.year ? `${pair} ${filter.year}` : pair
}

function normalizeStored(raw: unknown): ActiveGarageStored | null {
  if (!raw || typeof raw !== 'object') return null
  const parsed = raw as Partial<ActiveGarageStored> & { customerVehicleId?: string }
  const updatedAt =
    typeof parsed.updatedAt === 'string' && parsed.updatedAt
      ? parsed.updatedAt
      : new Date().toISOString()
  const filter =
    parsed.filter && typeof parsed.filter === 'object' ? (parsed.filter as VehicleFilter) : {}

  if (parsed.mode === 'cleared') {
    return { mode: 'cleared', customerVehicleId: null, filter: {}, updatedAt }
  }
  if (parsed.mode === 'session') {
    return { mode: 'session', customerVehicleId: null, filter, updatedAt }
  }
  if (parsed.mode === 'vehicle' || typeof parsed.customerVehicleId === 'string') {
    const id = parsed.customerVehicleId
    if (!id || typeof id !== 'string') return null
    return { mode: 'vehicle', customerVehicleId: id, filter, updatedAt }
  }
  return null
}

export function readActiveGarage(userId: string): ActiveGarageStored | null {
  if (typeof localStorage === 'undefined' || !userId) return null
  try {
    const raw = localStorage.getItem(activeGarageStorageKey(userId))
    if (!raw) return null
    return normalizeStored(JSON.parse(raw))
  } catch {
    return null
  }
}

export function writeActiveGarage(userId: string, payload: ActiveGarageStored): void {
  if (typeof localStorage === 'undefined' || !userId) return
  localStorage.setItem(activeGarageStorageKey(userId), JSON.stringify(payload))
}

/** Persiste limpeza explícita (não cai no principal no refresh). */
export function writeClearedActiveGarage(userId: string): void {
  writeActiveGarage(userId, {
    mode: 'cleared',
    customerVehicleId: null,
    filter: {},
    updatedAt: new Date().toISOString(),
  })
}

export function writeSessionActiveGarage(userId: string, filter: VehicleFilter): void {
  writeActiveGarage(userId, {
    mode: 'session',
    customerVehicleId: null,
    filter,
    updatedAt: new Date().toISOString(),
  })
}

export function writeVehicleActiveGarage(userId: string, vehicle: CustomerSavedVehicle): void {
  writeActiveGarage(userId, {
    mode: 'vehicle',
    customerVehicleId: vehicle.id,
    filter: vehicleToActiveFilter(vehicle),
    updatedAt: new Date().toISOString(),
  })
}

export function clearActiveGarage(userId: string): void {
  if (typeof localStorage === 'undefined' || !userId) return
  localStorage.removeItem(activeGarageStorageKey(userId))
}

/**
 * Valida o id ativo contra a lista da garagem.
 * Inválido → principal (se houver); senão null (limpar).
 * @deprecated Preferir resolveActiveState — mantido para testes/legado.
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

/**
 * Resolve veículo + filtro a partir do storage tipado.
 * - sem registro: fallback ao principal (1ª visita)
 * - cleared: null (Limpar explícito)
 * - session: só filter
 * - vehicle: id; se inválido → principal
 */
export function resolveActiveState(
  stored: ActiveGarageStored | null,
  vehicles: CustomerSavedVehicle[],
): ResolvedActiveGarage {
  if (stored?.mode === 'cleared') {
    return { mode: 'cleared', vehicle: null, filter: null }
  }
  if (stored?.mode === 'session') {
    const filter = stored.filter && Object.keys(stored.filter).length ? stored.filter : null
    return { mode: 'session', vehicle: null, filter }
  }
  if (stored?.mode === 'vehicle' && stored.customerVehicleId) {
    const vehicle = resolveActiveAgainstGarage(stored.customerVehicleId, vehicles)
    return {
      mode: vehicle ? 'vehicle' : vehicles.length ? 'vehicle' : 'none',
      vehicle,
      filter: vehicle ? vehicleToActiveFilter(vehicle) : null,
    }
  }
  // Sem storage: legado — principal se existir
  const primary = vehicles.find((v) => v.isPrimary) ?? null
  return {
    mode: primary ? 'vehicle' : 'none',
    vehicle: primary,
    filter: primary ? vehicleToActiveFilter(primary) : null,
  }
}
