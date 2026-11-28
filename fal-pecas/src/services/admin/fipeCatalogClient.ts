/**
 * Client admin → Edge fipe-catalog-lookup (token só no servidor).
 */
import { normalizeVehicleFuel } from '@/lib/vehicles/normalizeVehicleFuel'
import { getSupabase } from '@/lib/supabase'
import { splitApiModelo } from '@/services/plates/splitApiModelo'
import type { MasterIntelligenceRow } from '@/services/vehicles/vehicleMasterIntelligence'

export type FipeCodeName = { code: string; name: string }

export type FipeYearOption = FipeCodeName & {
  year: number
  fuel: string | null
}

async function invokeFipe(body: Record<string, unknown>): Promise<unknown> {
  const { data, error } = await getSupabase().functions.invoke('fipe-catalog-lookup', { body })
  if (error) throw new Error(error.message || 'Falha na consulta FIPE')
  const payload = data as { ok?: boolean; data?: unknown; error?: string }
  if (!payload?.ok) {
    throw new Error(payload?.error || 'Consulta FIPE indisponível')
  }
  return payload.data
}

function asList(raw: unknown): FipeCodeName[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const o = item as { code?: unknown; name?: unknown }
      const code = String(o.code ?? '').trim()
      const name = String(o.name ?? '').trim()
      if (!code || !name) return null
      return { code, name }
    })
    .filter((x): x is FipeCodeName => Boolean(x))
}

/** Extrai ano e combustível de "2020 Flex" / code "2020-5". */
export function parseFipeYearLabel(code: string, name: string): { year: number; fuel: string | null } | null {
  const fromName = name.match(/(19|20)\d{2}/)
  const fromCode = code.match(/(19|20)\d{2}/)
  const year = Number(fromName?.[0] ?? fromCode?.[0] ?? '')
  if (!Number.isFinite(year) || year < 1950 || year > 2100) return null
  const fuelPart = name.replace(String(year), '').trim()
  const fuel = normalizeVehicleFuel(fuelPart)
  return { year, fuel }
}

export async function fipeListBrands(): Promise<FipeCodeName[]> {
  return asList(await invokeFipe({ action: 'brands', vehicleType: 'cars' }))
}

export async function fipeListModels(brandId: string): Promise<FipeCodeName[]> {
  return asList(await invokeFipe({ action: 'models', brandId, vehicleType: 'cars' }))
}

export async function fipeListYears(brandId: string, modelId: string): Promise<FipeYearOption[]> {
  const list = asList(await invokeFipe({ action: 'years', brandId, modelId, vehicleType: 'cars' }))
  return list
    .map((y) => {
      const parsed = parseFipeYearLabel(y.code, y.name)
      if (!parsed) return null
      return { ...y, year: parsed.year, fuel: parsed.fuel }
    })
    .filter((x): x is FipeYearOption => Boolean(x))
}

type FipeSelectionPiece = {
  brandName: string
  modelName: string
  years: FipeYearOption[]
}

/** Monta linhas de inteligência a partir da seleção FIPE (1+ marcas · N modelos · anos). */
export function fipeSelectionToIntelligenceRows(
  input:
    | {
        brandName: string
        modelName: string
        years: FipeYearOption[]
      }
    | {
        brandName: string
        selections: Array<{ modelName: string; years: FipeYearOption[] }>
      }
    | {
        selections: FipeSelectionPiece[]
      },
): MasterIntelligenceRow[] {
  let pieces: FipeSelectionPiece[]
  if ('selections' in input) {
    const first = input.selections[0] as { brandName?: string; modelName?: string } | undefined
    if (first && typeof first.brandName === 'string') {
      pieces = input.selections as FipeSelectionPiece[]
    } else if ('brandName' in input) {
      const brandName = input.brandName
      pieces = (
        input.selections as Array<{ modelName: string; years: FipeYearOption[] }>
      ).map((s) => ({ brandName, modelName: s.modelName, years: s.years }))
    } else {
      pieces = []
    }
  } else {
    pieces = [{ brandName: input.brandName, modelName: input.modelName, years: input.years }]
  }

  const out: MasterIntelligenceRow[] = []
  for (const sel of pieces) {
    if (!sel.years.length) continue
    const brand = sel.brandName.trim()
    if (!brand) continue
    const split = splitApiModelo(sel.modelName)
    const modelo = (split.model || sel.modelName).trim()
    const motor = (split.engine ?? '').trim()
    const versao = (split.version ?? '').trim()
    const tracao = split.traction ?? undefined
    for (const y of sel.years) {
      out.push({
        montadora: brand,
        modelo,
        ano: String(y.year),
        motor,
        versao,
        combustivel: y.fuel ?? '',
        tracao,
      })
    }
  }
  return out
}
