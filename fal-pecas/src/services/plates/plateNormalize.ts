/** Normalização e validação de placas BR (antiga + Mercosul). */

const PLATE_STRIP = /[^A-Za-z0-9]/g

/** Antiga: ABC1234. Mercosul: ABC1D23. */
const PLATE_ANTIGA = /^[A-Z]{3}\d{4}$/
const PLATE_MERCOSUL = /^[A-Z]{3}\d[A-Z]\d{2}$/

export type PlateFormat = 'antiga' | 'mercosul'

export function normalizePlate(raw: string): string {
  return String(raw ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(PLATE_STRIP, '')
    .toUpperCase()
}

export function detectPlateFormat(normalized: string): PlateFormat | null {
  if (PLATE_ANTIGA.test(normalized)) return 'antiga'
  if (PLATE_MERCOSUL.test(normalized)) return 'mercosul'
  return null
}

export function isValidPlate(raw: string): boolean {
  return detectPlateFormat(normalizePlate(raw)) !== null
}

/** Máscara de digitação: ABC1D23 ou ABC-1234 (hífen opcional só visual). */
export function formatPlateMask(raw: string): string {
  const n = normalizePlate(raw).slice(0, 7)
  if (n.length <= 3) return n
  // Mercosul não usa hífen na digitação contínua; hífen só em padrão antiga parcial
  if (n.length === 7 && PLATE_MERCOSUL.test(n)) return n
  if (n.length > 3 && /^\d/.test(n[3] ?? '') && n.length <= 7 && !/[A-Z]/.test(n.slice(4))) {
    return `${n.slice(0, 3)}-${n.slice(3)}`
  }
  return n
}

export function plateValidationMessage(raw: string): string | null {
  const trimmed = String(raw ?? '').trim()
  if (!trimmed) return 'Informe a placa do veículo.'
  const n = normalizePlate(trimmed)
  if (!n) {
    return 'Formato inválido. Use placa antiga (ABC1234) ou Mercosul (ABC1D23).'
  }
  if (n.length < 7) return 'Placa incompleta. Use o padrão antigo (ABC1234) ou Mercosul (ABC1D23).'
  if (!isValidPlate(n)) {
    return 'Formato inválido. Use placa antiga (ABC1234) ou Mercosul (ABC1D23).'
  }
  return null
}
