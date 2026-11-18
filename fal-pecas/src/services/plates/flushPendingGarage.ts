import { ensureSavedVehicleFromFilter } from '@/services/customers/customerVehicleService'
import {
  clearPendingGarageVehicle,
  readPendingGarageVehicle,
} from '@/services/plates/pendingGarage'
import { isSupabaseConfigured } from '@/lib/supabase'
import type { CustomerSavedVehicle } from '@/types'

let inFlight: Promise<{
  ok: boolean
  skipped?: boolean
  message?: string
  vehicle?: CustomerSavedVehicle
}> | null = null

/**
 * Persiste pending da garagem após login (uma vez por payload).
 * Não limpa o pending em falha — permite nova tentativa.
 */
export async function flushPendingGarageVehicle(): Promise<{
  ok: boolean
  skipped?: boolean
  message?: string
  vehicle?: CustomerSavedVehicle
}> {
  if (!isSupabaseConfigured) return { ok: true, skipped: true }
  const pending = readPendingGarageVehicle()
  if (!pending?.maker || !pending?.model) return { ok: true, skipped: true }

  if (inFlight) return inFlight

  inFlight = (async () => {
    try {
      const vehicle = await ensureSavedVehicleFromFilter(pending)
      clearPendingGarageVehicle()
      return { ok: true, message: 'Veículo salvo na sua garagem.', vehicle }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Não foi possível salvar o veículo da garagem.'
      return { ok: false, message }
    } finally {
      inFlight = null
    }
  })()

  return inFlight
}
