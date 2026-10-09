/**
 * Período de aplicação (PVC): year_start / year_end é a fonte de verdade.
 * vehicle_versions.year é legado / opcional.
 * Formatação visual (MARCHA UI): YY/YY · YY/... · Sem ano inicial — sem alterar PVC.
 */

/** Copy quando só existe ano final (não inventar início). */
export const YEAR_NO_START_LABEL = 'Sem ano inicial'

function isValidYear(n: number): boolean {
  return Number.isInteger(n) && n >= 1950 && n <= 2100
}

/** Abrevia ano para dois dígitos (1997→97, 2005→05). */
export function toYy(year: number): string | null {
  if (!isValidYear(year)) return null
  return String(year % 100).padStart(2, '0')
}

/**
 * Label de apresentação do período.
 * Não modifica dados de origem; filtros usam yearMatchesVehicleApp (ints).
 */
export function formatVehicleAppYear(input: {
  yearStart?: number | null
  yearEnd?: number | null
  versionYear?: number | null
}): string | null {
  const start = input.yearStart ?? null
  const end = input.yearEnd ?? null

  if (start != null && end != null) {
    if (!isValidYear(start) || !isValidYear(end)) return null
    const a = toYy(start)
    const b = toYy(end)
    if (a == null || b == null) return null
    if (start === end) return a
    return `${a}/${b}`
  }
  if (start != null && end == null) {
    if (!isValidYear(start)) return null
    const a = toYy(start)
    return a == null ? null : `${a}/...`
  }
  if (start == null && end != null) {
    if (!isValidYear(end)) return null
    return YEAR_NO_START_LABEL
  }
  if (input.versionYear != null) {
    return toYy(input.versionYear)
  }
  return null
}

/** Ano escolhido no filtro cabe no período da aplicação? */
export function yearMatchesVehicleApp(
  year: number,
  yearStart: number | null | undefined,
  yearEnd: number | null | undefined,
  versionYear: number | null | undefined = null,
): boolean {
  if (!Number.isFinite(year)) return false
  const hasRange = yearStart != null || yearEnd != null
  if (hasRange) {
    if (yearStart != null && year < yearStart) return false
    if (yearEnd != null && year > yearEnd) return false
    return true
  }
  return versionYear != null && versionYear === year
}

/** Anos discretos para popular o seletor a partir de um período. */
export function expandYearsForSelector(
  yearStart: number | null | undefined,
  yearEnd: number | null | undefined,
  versionYear: number | null | undefined = null,
  maxSpan = 40,
): number[] {
  const out = new Set<number>()
  if (versionYear != null) out.add(versionYear)
  if (yearStart != null && yearEnd != null) {
    const lo = Math.min(yearStart, yearEnd)
    const hi = Math.max(yearStart, yearEnd)
    if (hi - lo <= maxSpan) {
      for (let y = lo; y <= hi; y += 1) out.add(y)
    } else {
      out.add(lo)
      out.add(hi)
    }
  } else if (yearStart != null) {
    out.add(yearStart)
  } else if (yearEnd != null) {
    out.add(yearEnd)
  }
  return [...out].sort((a, b) => b - a)
}
