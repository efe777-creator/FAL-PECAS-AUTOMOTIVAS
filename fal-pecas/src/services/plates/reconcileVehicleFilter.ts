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

/**
 * Sufixos (normalizados, sem separadores) que podem ser descartados ao encurtar
 * "needle composto → modelo base". Lista fechada: nunca prefixo arbitrário.
 */
export const KNOWN_SUFFIX_FOR_SHORTEN = new Set(
  [
    'flex', 'flexivel', 'gasolina', 'alcool', 'etanol', 'diesel', 'gnv', 'hibrido', 'hybrid',
    'sporting', 'volcano', 'blackhawk', 'altis', 'premium', 'apremiumh',
    'xei', 'xrs', 'xre', 'xrx', 'xr', 'sr', 'srv', 'srx', 'ex', 'exl', 'sv', 'ls', 'cl', 'cd', 'cs',
    'lx', 'exp', 'gli', 'lt', 'ltz', 'se', 'sel', 'gl', 'gls',
    '4x2', '4x4', 'cvt', 'at', 'mt', 'aut', 'auto', 'manual',
  ].map((w) => w.toLowerCase()),
)

/** Famílias/linhas distintas — nunca tratadas como sufixo descartável. */
const PROTECTED_FAMILY_SUFFIX = new Set([
  'cross', 'plus', 'new', 'space', 'up', 'fox', 'sport', 'variant', 'sedan', 'beetle',
])

function isKnownShortenSuffix(leftover: string): boolean {
  if (!leftover) return false
  if (PROTECTED_FAMILY_SUFFIX.has(leftover)) return false
  if (KNOWN_SUFFIX_FOR_SHORTEN.has(leftover)) return true
  // Combinação de tokens conhecidos colados (ex.: "flexcvt", "sr4x2", "cd4x2sr").
  const memo = new Map<number, boolean>()
  const words = [...KNOWN_SUFFIX_FOR_SHORTEN].sort((a, b) => b.length - a.length)
  const walk = (i: number): boolean => {
    if (i === leftover.length) return true
    const hit = memo.get(i)
    if (hit !== undefined) return hit
    let ok = false
    for (const w of words) {
      if (leftover.startsWith(w, i) && walk(i + w.length)) {
        ok = true
        break
      }
    }
    memo.set(i, ok)
    return ok
  }
  return walk(0)
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
  // Só encurta quando o sufixo excedente é combustível/trim/config conhecido —
  // NUNCA para família protegida (Corolla Cross ≠ Corolla).
  if (opts.preferShorterBase) {
    const bases = candidates
      .map((c) => ({ c, k: normalizeVehicleToken(c) }))
      .filter(
        ({ k }) =>
          k.length > 0 &&
          n.startsWith(k) &&
          k.length < n.length &&
          isKnownShortenSuffix(n.slice(k.length)),
      )
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
  /**
   * Exact model win: se o texto (ex. "Kwid Intense") já é um modelo no mestre,
   * NÃO preferShorterBase / split — evita desfazer escolha humana (Notes #6 residual).
   */
  const rawModel = filter.model?.trim()
  let model: string | undefined
  if (rawModel) {
    const exactHit = modelPool.find(
      (m) =>
        m === rawModel ||
        m.toLowerCase() === rawModel.toLowerCase() ||
        normalizeVehicleToken(m) === normalizeVehicleToken(rawModel),
    )
    if (exactHit) {
      model = exactHit
    } else {
      const modelNeedle = splitApiModelo(rawModel).model ?? rawModel
      model = pickClosest(modelPool, modelNeedle, { preferShorterBase: true })
    }
  }

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
