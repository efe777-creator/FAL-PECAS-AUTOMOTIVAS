/** Configuração física (carroceria / cabine). */

export const VEHICLE_BODY_CONFIGURATION_OPTIONS = [
  'hatch',
  'sedan',
  'perua',
  'cabine_simples',
  'cabine_estendida',
  'cabine_dupla',
  'furgao',
  'chassi',
  'picape',
] as const

export type VehicleBodyConfigurationOption =
  (typeof VEHICLE_BODY_CONFIGURATION_OPTIONS)[number]

export const VEHICLE_BODY_CONFIGURATION_SELECT_OPTIONS = [
  { value: 'hatch', label: 'Hatch' },
  { value: 'sedan', label: 'Sedan' },
  { value: 'perua', label: 'Perua' },
  { value: 'cabine_simples', label: 'Cabine simples' },
  { value: 'cabine_estendida', label: 'Cabine estendida' },
  { value: 'cabine_dupla', label: 'Cabine dupla' },
  { value: 'furgao', label: 'Furgão' },
  { value: 'chassi', label: 'Chassi' },
  { value: 'picape', label: 'Picape' },
] as const

export const VEHICLE_CLASS_OPTIONS = [
  'car',
  'light_utility',
  'motorcycle',
  'trailer',
  'unknown',
] as const

export type VehicleClassOption = (typeof VEHICLE_CLASS_OPTIONS)[number]

export const VEHICLE_CLASS_SELECT_OPTIONS = [
  { value: 'car', label: 'Passeio / SUV (car)' },
  { value: 'light_utility', label: 'Utilitário leve' },
  { value: 'motorcycle', label: 'Motocicleta' },
  { value: 'trailer', label: 'Reboque' },
  { value: 'unknown', label: 'Desconhecido' },
] as const

function fold(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\s+/g, ' ')
}

export function normalizeBodyConfiguration(
  raw: string | null | undefined,
): VehicleBodyConfigurationOption | null {
  const t = (raw ?? '').trim()
  if (!t) return null
  const f = fold(t)
  if (VEHICLE_BODY_CONFIGURATION_OPTIONS.includes(f as VehicleBodyConfigurationOption)) {
    return f as VehicleBodyConfigurationOption
  }
  if (f === 'hatch' || f.includes('hatch')) return 'hatch'
  if (f === 'sedan' || f.includes('sedan') || f.includes('seda')) return 'sedan'
  if (f === 'perua' || f.includes('wagon') || f.includes('weekend') || f.includes('sw')) {
    return 'perua'
  }
  if (f.includes('cabine simples') || f === 'cs') return 'cabine_simples'
  if (f.includes('cabine estendida') || f === 'ce') return 'cabine_estendida'
  if (f.includes('cabine dupla') || f === 'cd') return 'cabine_dupla'
  if (f.includes('furg')) return 'furgao'
  if (f.includes('chassi') || f.includes('chassis')) return 'chassi'
  if (f.includes('picape') || f.includes('pick') || f.includes('pickup')) return 'picape'
  return null
}

export function normalizeVehicleClass(
  raw: string | null | undefined,
): VehicleClassOption | null {
  const t = (raw ?? '').trim()
  if (!t) return null
  const f = fold(t)
  if (VEHICLE_CLASS_OPTIONS.includes(f as VehicleClassOption)) {
    return f as VehicleClassOption
  }
  return null
}

/** Classe efetiva: override da versão ou padrão do modelo. */
export function effectiveVehicleClass(
  versionClass: string | null | undefined,
  modelClass: string | null | undefined,
): string {
  const v = (versionClass ?? '').trim()
  if (v) return v
  const m = (modelClass ?? '').trim()
  return m || 'unknown'
}
