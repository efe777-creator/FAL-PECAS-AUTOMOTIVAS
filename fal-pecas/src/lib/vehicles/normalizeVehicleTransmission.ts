/** Vocabulário canônico de transmissão (categoria + detalhe). */

export const VEHICLE_TRANSMISSION_OPTIONS = ['manual', 'automatica', 'automatizada'] as const
export type VehicleTransmissionOption = (typeof VEHICLE_TRANSMISSION_OPTIONS)[number]

export const VEHICLE_TRANSMISSION_DETAIL_OPTIONS = ['cvt', 'at', 'amt'] as const
export type VehicleTransmissionDetailOption =
  (typeof VEHICLE_TRANSMISSION_DETAIL_OPTIONS)[number]

export const VEHICLE_TRANSMISSION_SELECT_OPTIONS = [
  { value: 'manual', label: 'Manual' },
  { value: 'automatica', label: 'Automática' },
  { value: 'automatizada', label: 'Automatizada' },
] as const

export const VEHICLE_TRANSMISSION_DETAIL_SELECT_OPTIONS = [
  { value: 'cvt', label: 'CVT' },
  { value: 'at', label: 'AT' },
  { value: 'amt', label: 'AMT' },
] as const

function fold(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\s+/g, ' ')
}

/**
 * Normaliza categoria. Vazio → null. Desconhecido → null.
 * "Automática CVT" → automatica (detalhe separado via normalizeTransmissionDetail).
 */
export function normalizeVehicleTransmission(
  raw: string | null | undefined,
): VehicleTransmissionOption | null {
  const t = (raw ?? '').trim()
  if (!t) return null
  const f = fold(t)
  if (f === 'manual' || f === 'mt' || f === 'cambio manual') return 'manual'
  if (
    f === 'automatizada' ||
    f === 'automated' ||
    f === 'amt' ||
    f.includes('automatizada')
  ) {
    return 'automatizada'
  }
  if (
    f === 'automatica' ||
    f === 'automatic' ||
    f === 'at' ||
    f === 'cvt' ||
    f.includes('automatic') ||
    f.includes('cvt')
  ) {
    return 'automatica'
  }
  return null
}

/** Extrai detalhe (cvt/at/amt). Vazio ou só categoria → null. */
export function normalizeTransmissionDetail(
  raw: string | null | undefined,
): VehicleTransmissionDetailOption | null {
  const t = (raw ?? '').trim()
  if (!t) return null
  const f = fold(t)
  if (f === 'cvt' || f.includes('cvt')) return 'cvt'
  if (f === 'amt' || f.includes('amt') || f.includes('automatizada')) return 'amt'
  if (f === 'at' || /\bat\b/.test(f) || f.includes('automatica at')) return 'at'
  return null
}

/**
 * Interpreta texto livre (ex.: "Automática CVT") → { transmission, transmissionDetail }.
 * Só "Automática" → detalhe null.
 */
export function parseTransmissionInput(raw: string | null | undefined): {
  transmission: VehicleTransmissionOption | null
  transmissionDetail: VehicleTransmissionDetailOption | null
} {
  const t = (raw ?? '').trim()
  if (!t) return { transmission: null, transmissionDetail: null }
  const transmission = normalizeVehicleTransmission(t)
  const transmissionDetail = normalizeTransmissionDetail(t)
  // "amt" sozinho já implica categoria automatizada
  if (transmissionDetail === 'amt' && !transmission) {
    return { transmission: 'automatizada', transmissionDetail: 'amt' }
  }
  if ((transmissionDetail === 'cvt' || transmissionDetail === 'at') && !transmission) {
    return { transmission: 'automatica', transmissionDetail }
  }
  return { transmission, transmissionDetail }
}
