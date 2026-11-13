import { vehicleModelKey } from '@/services/vehicles/vehicleOptionKeys'
import {
  VEHICLE_NOT_INFORMED_VALUE,
  withNotInformedOption,
} from '@/services/vehicles/vehicleNotInformed'
import type { VehicleFilter, VehicleOptionTree } from '@/types'
import { splitApiModelo } from './splitApiModelo'

/** Normaliza para comparação frouxa: "Cross Fox" ≈ "Crossfox". */
export function normalizeVehicleToken(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
}

type PickClosestOpts = {
  /** Para versões: permite Intense a partir de Intens (cadastro estende o needle). */
  allowCatalogExtension?: boolean
  /** Preferir base curta no cadastro quando o needle é composto (Fiesta Flex → Fiesta). */
  preferShorterBase?: boolean
}

function pickClosest(
  candidates: string[],
  needle: string | undefined,
  opts: PickClosestOpts = {},
): string | undefined {
  if (needle === VEHICLE_NOT_INFORMED_VALUE) return VEHICLE_NOT_INFORMED_VALUE
  if (!needle?.trim()) return undefined

  const n = normalizeVehicleToken(needle)
  if (!n) return needle

  // Bases: needle composto começa com candidato limpo ("fiestaflex" ← "fiesta").
  if (opts.preferShorterBase) {
    const bases = candidates
      .map((c) => ({ c, k: normalizeVehicleToken(c) }))
      .filter(({ k }) => k.length > 0 && n.startsWith(k) && k.length < n.length)
      .sort((a, b) => a.k.length - b.k.length)
    if (bases.length) return bases[0]!.c
  }

  const exact = candidates.find((c) => c === needle)
  if (exact) return exact
  const ci = candidates.find((c) => c.toLowerCase() === needle.toLowerCase())
  if (ci) return ci
  const byNorm = candidates.find((c) => normalizeVehicleToken(c) === n)
  if (byNorm) return byNorm

  if (opts.allowCatalogExtension) {
    // Intens → Intense (cadastro começa com o texto da placa).
    const extensions = candidates
      .map((c) => ({ c, k: normalizeVehicleToken(c) }))
      .filter(({ k }) => k.length > n.length && k.startsWith(n))
      .sort((a, b) => a.k.length - b.k.length)
    if (extensions.length) return extensions[0]!.c
  }

  // NÃO promover modelo mais longo só porque começa com o needle
  // (ex.: placa "Kwid" → cadastro "Kwid Intens 10MT").
  return needle
}

/**
 * Alinha filtro da placa aos nomes oficiais do cadastro FAL quando possível.
 * Valores sem match permanecem (para o Select poder exibir e o cliente corrigir).
 * Motor/versão vazios da placa viram "" ("Não informado").
 */
/** Abreviações da API de placas → nome comercial do mestre. */
const MAKER_PLATE_ALIASES: Record<string, string> = {
  chev: 'Chevrolet',
  gm: 'Chevrolet',
  chevy: 'Chevrolet',
  vw: 'Volkswagen',
  mercedes: 'Mercedes-Benz',
}

export function reconcileVehicleFilter(
  filter: VehicleFilter,
  tree: VehicleOptionTree,
): VehicleFilter {
  const makerNeedle =
    MAKER_PLATE_ALIASES[normalizeVehicleToken(filter.maker ?? '')] ?? filter.maker
  const maker = pickClosest(tree.makers, makerNeedle)
  const modelPool = maker
    ? (tree.modelsByMaker[maker] ?? [])
    : [...new Set(Object.values(tree.modelsByMaker).flat())]
  // Re-split modelo composto da placa antes de casar no mestre.
  const modelNeedle = filter.model?.trim()
    ? (splitApiModelo(filter.model).model ?? filter.model)
    : filter.model
  const model = pickClosest(modelPool, modelNeedle, { preferShorterBase: true })

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
    const picked = pickClosest(engines, engine, { allowCatalogExtension: true })
    // Sem evidência no mestre → Não informado (nunca inventar motor no filtro).
    engine =
      picked && engines.includes(picked) ? picked : VEHICLE_NOT_INFORMED_VALUE
  }

  let version = filter.version
  // Se a placa trouxe versão colada no modelo e split extraiu, usar quando filtro veio vazio.
  const splitVer = filter.model?.trim() ? splitApiModelo(filter.model).version : null
  if ((!version || version === VEHICLE_NOT_INFORMED_VALUE) && splitVer) {
    version = splitVer
  }
  if (version === VEHICLE_NOT_INFORMED_VALUE) {
    version = VEHICLE_NOT_INFORMED_VALUE
  } else if (maker && model && version) {
    const versions = tree.versionsByModel[vehicleModelKey(maker, model)] ?? []
    const picked = pickClosest(versions, version, { allowCatalogExtension: true })
    // Sem evidência no mestre → Não informado (nunca inventar versão no filtro).
    version =
      picked && versions.includes(picked) ? picked : VEHICLE_NOT_INFORMED_VALUE
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
