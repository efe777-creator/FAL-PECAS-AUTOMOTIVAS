/**
 * Cliente admin → Edge vehicle-identity-assist (Groq opcional).
 * Só sugere campos; nunca grava sozinho.
 */
import { getSupabase } from '@/lib/supabase'
import { normalizeVehicleFuel } from '@/lib/vehicles/normalizeVehicleFuel'
import { normalizeVehicleTraction } from '@/lib/vehicles/normalizeVehicleTraction'
import { splitApiModelo } from '@/services/plates/splitApiModelo'

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

const TORQUE_FAMILY = /\b(TSI|TFSI|THP|MPI|MSI|TDI|CDI|GDI|ECOBOOST|DIG-T)\b/i

export type VehicleIdentityFields = {
  model: string
  engine: string
  version: string
  fuel: string
  traction: string
}

/**
 * Reaplica o contrato local na linha já separada.
 * "Tera High" + versão "170" + motor "1.0 12V TSI" vira Tera / 1.0 12V 170 TSI / Highline.
 */
export function refineVehicleIdentityFields(input: {
  model?: string | null
  engine?: string | null
  version?: string | null
  fuel?: string | null
  traction?: string | null
}): VehicleIdentityFields {
  const model = (input.model ?? '').trim()
  const engine = (input.engine ?? '').trim()
  const version = (input.version ?? '').trim()
  let blob: string
  if (/^\d{3}$/.test(version) && TORQUE_FAMILY.test(engine)) {
    blob = `${model} ${engine.replace(TORQUE_FAMILY, `${version} $1`)}`.replace(/\s+/g, ' ').trim()
  } else {
    blob = [model, engine, version].filter(Boolean).join(' ')
  }
  const split = blob ? splitApiModelo(blob) : { model: null, engine: null, version: null, traction: null }
  return {
    model: (split.model || model).trim(),
    engine: (split.engine || '').trim(),
    version: (split.version || '').trim(),
    fuel: (input.fuel ? normalizeVehicleFuel(input.fuel) : '') || '',
    traction: (input.traction ? normalizeVehicleTraction(input.traction) : '') || '',
  }
}

/** A IA só preenche lacuna. Modelo, motor e versão ficam com a regra local. */
export function mergeIdentitySuggestion(
  local: VehicleIdentityFields,
  ai: VehicleIdentitySuggestion | null,
): VehicleIdentityFields {
  if (!ai) return local
  const fuel = (ai.fuel ? normalizeVehicleFuel(ai.fuel) : '') || local.fuel
  const traction = (ai.traction ? normalizeVehicleTraction(ai.traction) : '') || local.traction
  return {
    model: local.model,
    engine: local.engine,
    version: local.version,
    fuel,
    traction,
  }
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
