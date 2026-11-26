import { productionLifeYearBounds } from '@/services/vehicles/productionLifeYears'

const MAX_SPAN = 40

export type VersionYearRangeInput = {
  yearStart: number
  /** Null/undefined/NaN = vigente → até o fim da linha do modelo (ano corrente se em linha). */
  yearEnd?: number | null
  productionYearStart: number | null | undefined
  productionYearEnd: number | null | undefined
}

/**
 * Lista inclusiva de anos. Cap de span evita loops acidentais enormes.
 */
export function yearsInInclusiveRange(start: number, end: number): number[] {
  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    throw new Error('Anos de início e fim inválidos.')
  }
  const lo = Math.min(Math.trunc(start), Math.trunc(end))
  const hi = Math.max(Math.trunc(start), Math.trunc(end))
  if (hi - lo > MAX_SPAN) {
    throw new Error(`Intervalo máximo de ${MAX_SPAN} anos por configuração.`)
  }
  const out: number[] = []
  for (let y = lo; y <= hi; y++) out.push(y)
  return out
}

function isBlankYearEnd(yearEnd: number | null | undefined): boolean {
  if (yearEnd == null) return true
  return !Number.isFinite(Number(yearEnd))
}

/**
 * Config com fim = fim da linha do modelo (em linha → ano corrente).
 */
export function isConfigPeriodOpenEnded(
  yearEnd: number | null | undefined,
  productionYearStart: number | null | undefined,
  productionYearEnd: number | null | undefined,
  nowYear: number = new Date().getFullYear(),
): boolean {
  if (yearEnd == null || !Number.isFinite(Number(yearEnd))) return false
  if (productionYearStart == null || !Number.isFinite(Number(productionYearStart))) return false
  const { hi } = productionLifeYearBounds(
    Number(productionYearStart),
    productionYearEnd ?? null,
    nowYear,
  )
  return Math.trunc(Number(yearEnd)) === hi
}

/**
 * Garante vida de linha no modelo e que o período da config está contido nela.
 * Ano fim vazio → vigente até o hi da vida do modelo.
 */
export function assertVersionYearsWithinModelLife(input: VersionYearRangeInput): {
  yearStart: number
  yearEnd: number
  years: number[]
  openEnded: boolean
} {
  const start = Number(input.yearStart)
  if (!Number.isFinite(start)) {
    throw new Error('Informe o ano de início da configuração.')
  }

  const lifeStart = input.productionYearStart
  if (lifeStart == null || !Number.isFinite(Number(lifeStart))) {
    throw new Error('Defina a linha do modelo (Linha desde) antes de criar configurações.')
  }

  const { lo, hi } = productionLifeYearBounds(
    Number(lifeStart),
    input.productionYearEnd ?? null,
  )
  const openEnded = isBlankYearEnd(input.yearEnd)
  const ys = Math.trunc(start)
  const ye = openEnded ? hi : Math.trunc(Number(input.yearEnd))

  if (ys > ye) {
    throw new Error('Ano de início deve ser menor ou igual ao ano de fim.')
  }
  if (ys < lo || ye > hi) {
    throw new Error(
      `Configuração deve estar entre ${lo} e ${hi} (vida do modelo).`,
    )
  }

  return {
    yearStart: ys,
    yearEnd: ye,
    years: yearsInInclusiveRange(ys, ye),
    openEnded,
  }
}

/** Chave natural leve para skip de VV já existente (mesma identidade anual). */
export function versionNaturalKey(parts: {
  year: number | null
  engine: string | null
  versionName: string | null
  fuel?: string | null
}): string {
  const y = parts.year == null ? -1 : parts.year
  const eng = (parts.engine ?? '').trim().toLowerCase()
  const ver = (parts.versionName ?? '').trim().toLowerCase()
  const fuel = (parts.fuel ?? '').trim().toLowerCase()
  return `${y}|${eng}|${ver}|${fuel}`
}

/** Família de configuração (motor + versão + combustível), independente do ano. */
export function versionConfigGroupKey(parts: {
  engine: string | null
  versionName: string | null
  fuel?: string | null
}): string {
  const eng = (parts.engine ?? '').trim().toLowerCase()
  const ver = (parts.versionName ?? '').trim().toLowerCase()
  const fuel = (parts.fuel ?? '').trim().toLowerCase()
  return `${eng}|${ver}|${fuel}`
}

export type VersionConfigGroup<
  T extends {
    year: number | null
    engine: string | null
    versionName: string | null
    fuel?: string | null
    status?: string
  },
> = {
  key: string
  engine: string | null
  versionName: string | null
  fuel: string | null
  yearStart: number | null
  yearEnd: number | null
  years: number[]
  rows: T[]
  activeCount: number
}

/** Agrupa VVs por motor+versão+combustível. Período só com linhas ativas. */
export function groupVersionsByConfig<
  T extends {
    year: number | null
    engine: string | null
    versionName: string | null
    fuel?: string | null
    status?: string
  },
>(versions: T[]): VersionConfigGroup<T>[] {
  const map = new Map<string, T[]>()
  for (const v of versions) {
    const key = versionConfigGroupKey(v)
    const list = map.get(key)
    if (list) list.push(v)
    else map.set(key, [v])
  }
  const groups: VersionConfigGroup<T>[] = []
  for (const [key, rows] of map) {
    const activeRows = rows.filter((r) => r.status !== 'inactive')
    const periodSource = activeRows.length > 0 ? activeRows : rows
    const years = periodSource
      .map((r) => r.year)
      .filter((y): y is number => y != null && Number.isFinite(y))
      .sort((a, b) => a - b)
    const uniqYears = [...new Set(years)]
    const first = rows[0]!
    groups.push({
      key,
      engine: first.engine,
      versionName: first.versionName,
      fuel: first.fuel ?? null,
      yearStart: uniqYears[0] ?? null,
      yearEnd: uniqYears[uniqYears.length - 1] ?? null,
      years: uniqYears,
      rows,
      activeCount: activeRows.length,
    })
  }
  return groups.sort((a, b) => {
    // Ordem cronológica: início do período (nulls no fim), depois fim, depois motor/versão/fuel.
    const as = a.yearStart
    const bs = b.yearStart
    if (as != null && bs != null && as !== bs) return as - bs
    if (as != null && bs == null) return -1
    if (as == null && bs != null) return 1
    const ae = a.yearEnd
    const be = b.yearEnd
    if (ae != null && be != null && ae !== be) return ae - be
    const eng = (a.engine ?? '').localeCompare(b.engine ?? '', 'pt-BR')
    if (eng !== 0) return eng
    const ver = (a.versionName ?? '').localeCompare(b.versionName ?? '', 'pt-BR')
    if (ver !== 0) return ver
    return (a.fuel ?? '').localeCompare(b.fuel ?? '', 'pt-BR')
  })
}

/** Ano civil → 2 dígitos (ex.: 2022 → "22"). */
export function shortVehicleYear(year: number): string {
  const y = Math.trunc(year)
  return String(((y % 100) + 100) % 100).padStart(2, '0')
}

/**
 * Rótulo de período no estilo placa/BR: `22`, `10/15`, `22/...` (vigente).
 */
export function formatVersionPeriodLabel(
  yearStart: number | null,
  yearEnd: number | null,
  opts?: { openEnded?: boolean },
): string {
  if (yearStart == null && yearEnd == null) return '—'
  if (opts?.openEnded && yearStart != null) return `${shortVehicleYear(yearStart)}/...`
  if (yearStart != null && yearEnd != null && yearStart === yearEnd) {
    return shortVehicleYear(yearStart)
  }
  if (yearStart != null && yearEnd != null) {
    return `${shortVehicleYear(yearStart)}/${shortVehicleYear(yearEnd)}`
  }
  return shortVehicleYear(Number(yearStart ?? yearEnd))
}
