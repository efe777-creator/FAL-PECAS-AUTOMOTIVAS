/**
 * Período de aplicação (PVC): year_start / year_end é a fonte de verdade.
 * vehicle_versions.year é legado / opcional.
 * Formatação visual (card/apps): YY/YY · YY/... · .../YY — sem alterar PVC.
 *
 * Regra única (filtro, match e SQL):
 *   AnoFinalEfetivo = yearEnd ?? anoCivilAtual
 *   compatível ⇔ yearStart <= ano <= AnoFinalEfetivo (quando há período PVC)
 * Match/SQL tratam year_end nulo como aberto (sem teto no “hoje”);
 * o seletor limita a expansão ao ano civil atual (sem anos futuros).
 */

/** @deprecated Preferir formato `.../YY` via formatVehicleAppYear. */
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
 * Fim efetivo do período para UI/expansão de filtros.
 * year_end preenchido = encerra naquele ano; vazio = vigente até o ano civil atual.
 */
export function effectiveYearEnd(
  yearEnd: number | null | undefined,
  nowYear: number = new Date().getFullYear(),
): number {
  return yearEnd != null ? yearEnd : nowYear
}

/**
 * Label de apresentação do período no card (ex.: 12/...).
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
    const b = toYy(end)
    return b == null ? null : `.../${b}`
  }
  if (input.versionYear != null) {
    return toYy(input.versionYear)
  }
  return null
}

/**
 * Valida inputs de período PVC no admin.
 * Ano inicial obrigatório; ano final opcional (vazio = vigente até o ano atual).
 */
export function validatePvcYearInputs(
  startRaw: string,
  endRaw: string,
):
  | { ok: true; yearStart: number; yearEnd: number | null }
  | { ok: false; message: string } {
  const s = startRaw.trim()
  const e = endRaw.trim()
  if (!s) {
    return { ok: false, message: 'Ano inicial é obrigatório' }
  }
  const yearStart = Number(s)
  if (!Number.isInteger(yearStart) || !isValidYear(yearStart)) {
    return { ok: false, message: 'Ano início inválido' }
  }
  if (!e) {
    return { ok: true, yearStart, yearEnd: null }
  }
  const yearEnd = Number(e)
  if (!Number.isInteger(yearEnd) || !isValidYear(yearEnd)) {
    return { ok: false, message: 'Ano fim inválido' }
  }
  if (yearEnd < yearStart) {
    return { ok: false, message: 'Ano fim menor que ano início' }
  }
  return { ok: true, yearStart, yearEnd }
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

function pushYearSpan(out: Set<number>, lo: number, hi: number, maxSpan: number) {
  if (hi < lo) return
  if (hi - lo <= maxSpan) {
    for (let y = lo; y <= hi; y += 1) out.add(y)
  } else {
    out.add(lo)
    out.add(hi)
  }
}

/**
 * Anos discretos para popular o seletor a partir de um período PVC.
 * Aberto (yearEnd null): yearStart … anoCivilAtual (sem inventar futuros).
 */
export function expandYearsForSelector(
  yearStart: number | null | undefined,
  yearEnd: number | null | undefined,
  versionYear: number | null | undefined = null,
  maxSpan = 40,
  nowYear: number = new Date().getFullYear(),
): number[] {
  const out = new Set<number>()
  if (versionYear != null) out.add(versionYear)

  if (yearStart != null && yearEnd != null) {
    const lo = Math.min(yearStart, yearEnd)
    const hi = Math.max(yearStart, yearEnd)
    pushYearSpan(out, lo, hi, maxSpan)
  } else if (yearStart != null) {
    const hi = effectiveYearEnd(null, nowYear)
    pushYearSpan(out, yearStart, hi, maxSpan)
  } else if (yearEnd != null) {
    out.add(yearEnd)
  }

  return [...out].sort((a, b) => b - a)
}
