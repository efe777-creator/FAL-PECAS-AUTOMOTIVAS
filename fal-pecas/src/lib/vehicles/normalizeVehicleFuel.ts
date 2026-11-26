/** Vocabulário canônico de combustível na config VV (admin/import). */
export const VEHICLE_FUEL_OPTIONS = [
  'Flex',
  'Gasolina',
  'Etanol',
  'Diesel',
  'GNV',
  'Elétrico',
  'Híbrido',
] as const

export type VehicleFuelOption = (typeof VEHICLE_FUEL_OPTIONS)[number]

const ALIAS_TO_CANONICAL: Record<string, VehicleFuelOption> = {
  flex: 'Flex',
  flexivel: 'Flex',
  flexível: 'Flex',
  'alcool / gasolina': 'Flex',
  'álcool / gasolina': 'Flex',
  'alcool/gasolina': 'Flex',
  'álcool/gasolina': 'Flex',
  'gasolina/alcool': 'Flex',
  'gasolina/álcool': 'Flex',
  gasolina: 'Gasolina',
  gas: 'Gasolina',
  etanol: 'Etanol',
  alcool: 'Etanol',
  álcool: 'Etanol',
  diesel: 'Diesel',
  gnv: 'GNV',
  gasnatural: 'GNV',
  eletrico: 'Elétrico',
  elétrico: 'Elétrico',
  electric: 'Elétrico',
  hibrido: 'Híbrido',
  híbrido: 'Híbrido',
  hybrid: 'Híbrido',
}

function foldFuelKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\s+/g, ' ')
}

/**
 * Normaliza combustível para label canônico. Vazio → null.
 * Valor desconhecido (não vazio) → null (evita lixo no índice).
 */
export function normalizeVehicleFuel(raw: string | null | undefined): string | null {
  const t = (raw ?? '').trim()
  if (!t) return null
  const exact = VEHICLE_FUEL_OPTIONS.find((o) => o.toLowerCase() === t.toLowerCase())
  if (exact) return exact
  const folded = foldFuelKey(t)
  if (ALIAS_TO_CANONICAL[folded]) return ALIAS_TO_CANONICAL[folded]
  // Sem acento no mapa
  const noAccent = folded.normalize('NFD').replace(/\p{M}/gu, '')
  if (ALIAS_TO_CANONICAL[noAccent]) return ALIAS_TO_CANONICAL[noAccent]
  return null
}

export const VEHICLE_FUEL_SELECT_OPTIONS = VEHICLE_FUEL_OPTIONS.map((v) => ({
  value: v,
  label: v,
}))
