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
  'die.': 'Diesel',
  'dies.': 'Diesel',
  dies: 'Diesel',
  gnv: 'GNV',
  gasnatural: 'GNV',
  'gas natural': 'GNV',
  'gas natural veicular': 'GNV',
  tetrafuel: 'GNV',
  'alc.': 'Etanol',
  alc: 'Etanol',
  'gasol.': 'Gasolina',
  gasol: 'Gasolina',
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

/**
 * Combustível escrito no nome FIPE, quando o ano não trouxe rótulo.
 * Gás Natural e Tetrafuel são GNV (código 7 da FIPE). Álcool fica Etanol.
 * Gasolina + álcool no mesmo nome é Flex.
 */
export function fuelFromVehicleName(raw: string | null | undefined): string | null {
  const text = (raw ?? '').trim()
  if (!text) return null
  const phrase = foldFuelKey(text)
  if (/\btetrafuel\b/.test(phrase) || /\bgas natural\b/.test(phrase) || /\bgnv\b/.test(phrase)) {
    return 'GNV'
  }
  let s = text
  s = s.replace(/\bDies?\.+(?=(?:Aut|Mec)\b)/gi, 'Diesel ')
  s = s.replace(/\bDies\.?(?!\w)/gi, 'Diesel')
  s = s.replace(/\bDie\.?(?!\w)/gi, 'Diesel')
  s = s.replace(/\bAlc\.?(?!\w)/gi, 'Alcool')
  s = s.replace(/\bGasol\.?(?!\w)/gi, 'Gasolina')
  s = s.replace(/\bH[ií]b\.?(?!\w)/gi, 'Hibrido')
  s = s.replace(/\bEletr\.?(?!\w)/gi, 'Eletrico')
  s = s.replace(/\b[FT]\.\s*Flex\b/gi, 'Flex')
  let flex = false
  let diesel = false
  let gasolina = false
  let etanol = false
  let hibrido = false
  let eletrico = false
  for (const tok of s.split(/[^A-Za-zÀ-ÿ0-9.]+/)) {
    const fuel = normalizeVehicleFuel(tok.replace(/\.+$/g, ''))
    if (fuel === 'Flex') flex = true
    else if (fuel === 'Diesel') diesel = true
    else if (fuel === 'Gasolina') gasolina = true
    else if (fuel === 'Etanol') etanol = true
    else if (fuel === 'Híbrido') hibrido = true
    else if (fuel === 'Elétrico') eletrico = true
    else if (fuel === 'GNV') return 'GNV'
  }
  if (eletrico) return 'Elétrico'
  if (hibrido) return 'Híbrido'
  if (flex || (gasolina && etanol)) return 'Flex'
  if (diesel) return 'Diesel'
  if (gasolina) return 'Gasolina'
  if (etanol) return 'Etanol'
  return null
}
