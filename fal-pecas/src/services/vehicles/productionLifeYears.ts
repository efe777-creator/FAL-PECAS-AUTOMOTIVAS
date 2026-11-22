/**
 * Expande vida de linha em anos do seletor.
 * `production_year_end = null` = em linha → usa ano corrente (não colapsa no start).
 */
export function productionLifeYearBounds(
  start: number,
  end: number | null,
  nowYear: number = new Date().getFullYear(),
): { lo: number; hi: number } {
  const endEff =
    end != null && Number.isFinite(end) ? end : Math.max(nowYear, start)
  const lo = Math.min(start, endEff)
  const hi = Math.max(start, endEff)
  return { lo, hi }
}

/** Anos a injetar no seletor a partir da vida (cap 40 anos de span). */
export function yearsFromProductionLife(
  start: number,
  end: number | null,
  nowYear: number = new Date().getFullYear(),
): number[] {
  const { lo, hi } = productionLifeYearBounds(start, end, nowYear)
  const span = hi - lo
  if (span <= 40) {
    const out: number[] = []
    for (let y = lo; y <= hi; y++) out.push(y)
    return out
  }
  return [lo, hi]
}
