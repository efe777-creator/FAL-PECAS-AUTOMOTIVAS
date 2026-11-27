/** Vocabulário canônico de tração (categoria + detalhe). */

export const VEHICLE_TRACTION_OPTIONS = ['4x2', '4x4', 'awd'] as const
export type VehicleTractionOption = (typeof VEHICLE_TRACTION_OPTIONS)[number]

export const VEHICLE_TRACTION_DETAIL_OPTIONS = ['dianteira', 'traseira'] as const
export type VehicleTractionDetailOption = (typeof VEHICLE_TRACTION_DETAIL_OPTIONS)[number]

export const VEHICLE_TRACTION_SELECT_OPTIONS = [
  { value: '4x2', label: '4x2' },
  { value: '4x4', label: '4x4' },
  { value: 'awd', label: 'AWD' },
] as const

export const VEHICLE_TRACTION_DETAIL_SELECT_OPTIONS = [
  { value: 'dianteira', label: 'Dianteira' },
  { value: 'traseira', label: 'Traseira' },
] as const

function fold(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\s+/g, ' ')
}

/** Normaliza categoria. "4x2" sozinho → 4x2 (detalhe null). Não infere eixo. */
export function normalizeVehicleTraction(
  raw: string | null | undefined,
): VehicleTractionOption | null {
  const t = (raw ?? '').trim()
  if (!t) return null
  const f = fold(t)
  if (f === 'awd' || f.includes('awd') || f.includes('all wheel')) return 'awd'
  if (f === '4x4' || f === '4wd' || f.includes('4x4') || f.includes('4wd')) return '4x4'
  if (f === '4x2' || f === '2wd' || f.includes('4x2') || f.includes('2wd')) return '4x2'
  return null
}

/** Detalhe dianteira/traseira. Só "4x2" → null. */
export function normalizeTractionDetail(
  raw: string | null | undefined,
): VehicleTractionDetailOption | null {
  const t = (raw ?? '').trim()
  if (!t) return null
  const f = fold(t)
  if (f.includes('dianteira') || f.includes('fwd') || f.includes('front')) return 'dianteira'
  if (f.includes('traseira') || f.includes('rwd') || f.includes('rear')) return 'traseira'
  return null
}

export function parseTractionInput(raw: string | null | undefined): {
  traction: VehicleTractionOption | null
  tractionDetail: VehicleTractionDetailOption | null
} {
  const t = (raw ?? '').trim()
  if (!t) return { traction: null, tractionDetail: null }
  return {
    traction: normalizeVehicleTraction(t),
    tractionDetail: normalizeTractionDetail(t),
  }
}
