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

export function consumeAskGaragePrompt(): VehicleFilter | null {
  try {
    const raw = sessionStorage.getItem(ASK_KEY)
    if (!raw) return null
    sessionStorage.removeItem(ASK_KEY)
    return JSON.parse(raw) as VehicleFilter
  } catch {
    return null
  }
}
