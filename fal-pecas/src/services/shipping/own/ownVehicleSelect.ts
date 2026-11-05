import type { OwnProductLogisticProfile } from './ownPol'

export type OwnVehicleCategory = {
  id: string
  code: string
  label: string
  capacityPol: number
  sortOrder: number
  active: boolean
}

export type OwnVehicleTariff = {
  categoryId: string
  tarifaMinima: number
  valorPorKm: number
  active: boolean
  version: number
}

export type OwnVehicleSelectResult =
  | {
      ok: true
      category: OwnVehicleCategory
      tariff: OwnVehicleTariff
    }
  | { ok: false; status: 'manual_review'; message: string }

const MOTORCYCLE_MAX_POL = 12

function categoryRank(code: string, sortOrder: number): number {
  return sortOrder
}

function meetsMin(candidateCode: string, requiredMin: string | null, order: string[]): boolean {
  if (!requiredMin) return true
  const ci = order.indexOf(candidateCode)
  const ri = order.indexOf(requiredMin)
  if (ci < 0 || ri < 0) return candidateCode === requiredMin
  return ci >= ri
}

/**
 * Menor veículo compatível.
 * Regra APROVADA: moto ≤ 12 POL inclusive; >12 → carro obrigatório.
 * Restrições/compatibilidade prevalecem sobre POL.
 */
export function selectOwnVehicle(input: {
  polTotal: number
  profiles: OwnProductLogisticProfile[]
  categories: OwnVehicleCategory[]
  tariffs: OwnVehicleTariff[]
}): OwnVehicleSelectResult {
  const { polTotal, profiles, categories, tariffs } = input
  const order = [...categories].sort((a, b) => a.sortOrder - b.sortOrder).map((c) => c.code)

  let requiredMin: string | null = null
  for (const p of profiles) {
    if (!p.vehicleMinCode) continue
    if (!requiredMin) {
      requiredMin = p.vehicleMinCode
      continue
    }
    const cur = order.indexOf(requiredMin)
    const next = order.indexOf(p.vehicleMinCode)
    if (next > cur) requiredMin = p.vehicleMinCode
  }

  const tariffByCat = new Map(
    tariffs.filter((t) => t.active).map((t) => [t.categoryId, t] as const),
  )

  let candidates = categories.filter((c) => c.active && tariffByCat.has(c.id))
  candidates = candidates.filter((c) => c.capacityPol >= polTotal)
  candidates = candidates.filter((c) => meetsMin(c.code, requiredMin, order))

  candidates = candidates.filter((c) =>
    profiles.every((p) => {
      if (!p.compatibleVehicleCodes?.length) return true
      return p.compatibleVehicleCodes.includes(c.code)
    }),
  )

  if (polTotal > MOTORCYCLE_MAX_POL) {
    candidates = candidates.filter((c) => c.code !== 'motorcycle')
  }

  candidates.sort((a, b) => categoryRank(a.code, a.sortOrder) - categoryRank(b.code, b.sortOrder))

  const chosen = candidates[0]
  if (!chosen) {
    return {
      ok: false,
      status: 'manual_review',
      message: 'Carga requer análise manual (sem veículo compatível)',
    }
  }
  const tariff = tariffByCat.get(chosen.id)!
  return { ok: true, category: chosen, tariff }
}

export { MOTORCYCLE_MAX_POL }
