import type { VehicleFilter } from '@/types'

const KEY = 'fal_pending_garage_vehicle'
const ASK_KEY = 'fal_ask_garage_after_plate'

export type PendingGarageVehicle = VehicleFilter & {
  returnTo?: string
}

export function savePendingGarageVehicle(payload: PendingGarageVehicle): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(payload))
  } catch {
    /* ignore quota */
  }
}

export function readPendingGarageVehicle(): PendingGarageVehicle | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return null
    return JSON.parse(raw) as PendingGarageVehicle
  } catch {
    return null
  }
}

export function clearPendingGarageVehicle(): void {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}

/** Após confirmar placa na Home e ir ao catálogo, perguntar garagem. */
export function saveAskGaragePrompt(filter: VehicleFilter): void {
  try {
    sessionStorage.setItem(ASK_KEY, JSON.stringify(filter))
  } catch {
    /* ignore */
  }
}

/** Lê sem remover — seguro com Strict Mode e múltiplos mounts. */
export function readAskGaragePrompt(): VehicleFilter | null {
  try {
    const raw = sessionStorage.getItem(ASK_KEY)
    if (!raw) return null
    return JSON.parse(raw) as VehicleFilter
  } catch {
    return null
  }
}

export function clearAskGaragePrompt(): void {
  try {
    sessionStorage.removeItem(ASK_KEY)
  } catch {
    /* ignore */
  }
}

/** Lê e remove (legado). Prefira read + clear após resposta do usuário. */
export function consumeAskGaragePrompt(): VehicleFilter | null {
  const value = readAskGaragePrompt()
  if (value) clearAskGaragePrompt()
  return value
}
