/**
 * Cliente admin → Edge vehicle-identity-assist (Groq opcional).
 * Só sugere campos; nunca grava sozinho.
 */
import { getSupabase } from '@/lib/supabase'
import { normalizeVehicleFuel } from '@/lib/vehicles/normalizeVehicleFuel'
import { normalizeVehicleTraction } from '@/lib/vehicles/normalizeVehicleTraction'

export type VehicleIdentitySuggestion = {
  model?: string | null
  engine?: string | null
  version?: string | null
  fuel?: string | null
  traction?: string | null
}

export type VehicleIdentityAssistResult = {
  ok: boolean
  mode: string
  message?: string
  suggestion: VehicleIdentitySuggestion | null
}

/** Sanitiza JSON da IA para o contrato FAL (válvulas/turbo no motor). */
export function sanitizeIdentitySuggestion(raw: unknown): VehicleIdentitySuggestion | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const out: VehicleIdentitySuggestion = {}
  for (const k of ['model', 'engine', 'version'] as const) {
    const v = o[k]
    if (typeof v === 'string' && v.trim()) out[k] = v.trim()
  }
  if (typeof o.fuel === 'string') {
    out.fuel = normalizeVehicleFuel(o.fuel)
  }
  if (typeof o.traction === 'string') {
    out.traction = normalizeVehicleTraction(o.traction)
  }
  return Object.keys(out).length ? out : null
}

export async function suggestVehicleIdentityAssist(input: {
  rawName: string
  maker?: string
  model?: string
  engine?: string
  version?: string
  fuel?: string
  traction?: string
}): Promise<VehicleIdentityAssistResult> {
  const rawName = input.rawName.trim()
  if (!rawName) {
    return { ok: false, mode: 'empty', message: 'Informe o nome para sugerir.', suggestion: null }
  }
  const { data, error } = await getSupabase().functions.invoke('vehicle-identity-assist', {
    body: {
      rawName,
      maker: input.maker ?? null,
      model: input.model ?? null,
      engine: input.engine ?? null,
      version: input.version ?? null,
      fuel: input.fuel ?? null,
      traction: input.traction ?? null,
    },
  })
  if (error) {
    return {
      ok: false,
      mode: 'invoke_error',
      message: error.message || 'Falha ao chamar IA',
      suggestion: null,
    }
  }
  const payload = data as {
    ok?: boolean
    mode?: string
    message?: string
    suggestion?: unknown
  }
  const suggestion = sanitizeIdentitySuggestion(payload?.suggestion)
  return {
    ok: Boolean(payload?.ok),
    mode: String(payload?.mode ?? 'unknown'),
    message: payload?.message,
    suggestion,
  }
}
