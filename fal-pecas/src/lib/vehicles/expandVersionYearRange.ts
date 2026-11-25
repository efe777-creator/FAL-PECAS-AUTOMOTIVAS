import { productionLifeYearBounds } from '@/services/vehicles/productionLifeYears'

const MAX_SPAN = 40

export type VersionYearRangeInput = {
  yearStart: number
  yearEnd: number
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

/**
 * Garante vida de linha no modelo e que o período da config está contido nela.
 */
export function assertVersionYearsWithinModelLife(input: VersionYearRangeInput): {
  yearStart: number
  yearEnd: number
  years: number[]
} {
  const start = Number(input.yearStart)
  const end = Number(input.yearEnd)
  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    throw new Error('Informe ano de início e ano de fim da configuração.')
  }
  if (Math.trunc(start) > Math.trunc(end)) {
    throw new Error('Ano de início deve ser menor ou igual ao ano de fim.')
  }

  const lifeStart = input.productionYearStart
  if (lifeStart == null || !Number.isFinite(Number(lifeStart))) {
    throw new Error('Defina a linha do modelo (Linha desde) antes de criar configurações.')
  }

  const { lo, hi } = productionLifeYearBounds(
    Number(lifeStart),
    input.productionYearEnd ?? null,
  )
  const ys = Math.trunc(start)
  const ye = Math.trunc(end)
  if (ys < lo || ye > hi) {
    throw new Error(
      `Configuração deve estar entre ${lo} e ${hi} (vida do modelo).`,
    )
  }

  return {
    yearStart: ys,
    yearEnd: ye,
    years: yearsInInclusiveRange(ys, ye),
  }
}

/** Chave natural leve para skip de VV já existente (mesma identidade anual). */
export function versionNaturalKey(parts: {
  year: number | null
  engine: string | null
  versionName: string | null
}): string {
  const y = parts.year == null ? -1 : parts.year
  const eng = (parts.engine ?? '').trim().toLowerCase()
  const ver = (parts.versionName ?? '').trim().toLowerCase()
  return `${y}|${eng}|${ver}`
}

/** Família de configuração (motor + versão), independente do ano. */
export function versionConfigGroupKey(parts: {
  engine: string | null
  versionName: string | null
}): string {
  const eng = (parts.engine ?? '').trim().toLowerCase()
  const ver = (parts.versionName ?? '').trim().toLowerCase()
  return `${eng}|${ver}`
}

export type VersionConfigGroup<T extends { year: number | null; engine: string | null; versionName: string | null; status?: string }> =
  {
    key: string
    engine: string | null
    versionName: string | null
    yearStart: number | null
    yearEnd: number | null
    years: number[]
    rows: T[]
    activeCount: number
  }

/** Agrupa VVs por motor+versão e deriva o período (min–max dos anos com número). */
export function groupVersionsByConfig<
  T extends { year: number | null; engine: string | null; versionName: string | null; status?: string },
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
    const years = rows
      .map((r) => r.year)
      .filter((y): y is number => y != null && Number.isFinite(y))
      .sort((a, b) => a - b)
    const uniqYears = [...new Set(years)]
    const first = rows[0]!
    groups.push({
      key,
      engine: first.engine,
      versionName: first.versionName,
      yearStart: uniqYears[0] ?? null,
      yearEnd: uniqYears[uniqYears.length - 1] ?? null,
      years: uniqYears,
      rows,
      activeCount: rows.filter((r) => r.status !== 'inactive').length,
    })
  }
  return groups.sort((a, b) => {
    const eng = (a.engine ?? '').localeCompare(b.engine ?? '', 'pt-BR')
    if (eng !== 0) return eng
    return (a.versionName ?? '').localeCompare(b.versionName ?? '', 'pt-BR')
  })
}

export function formatVersionPeriodLabel(
  yearStart: number | null,
  yearEnd: number | null,
): string {
  if (yearStart == null && yearEnd == null) return '—'
  if (yearStart != null && yearEnd != null && yearStart === yearEnd) return String(yearStart)
  if (yearStart != null && yearEnd != null) return `${yearStart}–${yearEnd}`
  return String(yearStart ?? yearEnd)
}
