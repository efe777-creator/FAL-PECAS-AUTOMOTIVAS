import { vehicleModelKey } from '@/services/vehicles/vehicleOptionKeys'
import {
  VEHICLE_NOT_INFORMED_VALUE,
  withNotInformedOption,
} from '@/services/vehicles/vehicleNotInformed'
import type { VehicleFilter, VehicleOptionTree } from '@/types'

/** Normaliza para comparação frouxa: "Cross Fox" ≈ "Crossfox". */
export function normalizeVehicleToken(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
}

function pickClosest(candidates: string[], needle: string | undefined): string | undefined {
  if (needle === VEHICLE_NOT_INFORMED_VALUE) return VEHICLE_NOT_INFORMED_VALUE
  if (!needle?.trim()) return undefined
  const exact = candidates.find((c) => c === needle)
  if (exact) return exact
  const ci = candidates.find((c) => c.toLowerCase() === needle.toLowerCase())
  if (ci) return ci
  const n = normalizeVehicleToken(needle)
  if (!n) return needle
  const byNorm = candidates.find((c) => normalizeVehicleToken(c) === n)
  if (byNorm) return byNorm
  const starts = candidates.find(
    (c) =>
      normalizeVehicleToken(c).startsWith(n) || n.startsWith(normalizeVehicleToken(c)),
  )
  if (starts) return starts
  // Mantém valor da placa para exibir (Select injeta option).
  return needle
}

/**
 * Alinha filtro da placa aos nomes oficiais do cadastro FAL quando possível.
 * Valores sem match permanecem (para o Select poder exibir e o cliente corrigir).
 * Motor/versão vazios da placa viram "" ("Não informado").
 */
export function reconcileVehicleFilter(
  filter: VehicleFilter,
  tree: VehicleOptionTree,
): VehicleFilter {
  const maker = pickClosest(tree.makers, filter.maker)
  const modelPool = maker
    ? (tree.modelsByMaker[maker] ?? [])
    : [...new Set(Object.values(tree.modelsByMaker).flat())]
  const model = pickClosest(modelPool, filter.model)

  let year = filter.year
  if (maker && model && year) {
    // Mantém ano da placa; UI injeta option se ainda não estiver na árvore.
    year = filter.year
  }

  let engine = filter.engine
  if (engine === VEHICLE_NOT_INFORMED_VALUE) {
    engine = VEHICLE_NOT_INFORMED_VALUE
  } else if (maker && model && engine) {
    const engines = tree.enginesByModel[vehicleModelKey(maker, model)] ?? []
    engine = pickClosest(engines, engine)
  }

  let version = filter.version
  if (version === VEHICLE_NOT_INFORMED_VALUE) {
    version = VEHICLE_NOT_INFORMED_VALUE
  } else if (maker && model && version) {
    const versions = tree.versionsByModel[vehicleModelKey(maker, model)] ?? []
    version = pickClosest(versions, version)
  }

  return {
    maker: maker || undefined,
    model: model || undefined,
    year: year || undefined,
    // Preserva "" (Não informado) — distinto de undefined (não selecionado)
    engine: engine === VEHICLE_NOT_INFORMED_VALUE ? VEHICLE_NOT_INFORMED_VALUE : engine || undefined,
    version:
      version === VEHICLE_NOT_INFORMED_VALUE ? VEHICLE_NOT_INFORMED_VALUE : version || undefined,
  }
}

export function selectOptionsWithValue(
  options: Array<{ value: string; label: string }>,
  value: string | undefined,
): Array<{ value: string; label: string }> {
  return withNotInformedOption(options, value)
}
