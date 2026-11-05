/**
 * Frete próprio v2 — fórmula:
 * frete = max(distanceKmOneWay * valorPorKm, tarifaMinima) + adicional
 * Distância = só ida.
 */
export function computeOwnFreightAmount(input: {
  distanceKmOneWay: number
  valorPorKm: number
  tarifaMinima: number
  adicional?: number
}): number {
  const km = Number(input.distanceKmOneWay)
  const perKm = Number(input.valorPorKm)
  const min = Number(input.tarifaMinima)
  const extra = Number(input.adicional ?? 0)
  if (!Number.isFinite(km) || km < 0) throw new Error('distance_km_invalid')
  if (!Number.isFinite(perKm) || perKm < 0) throw new Error('valor_por_km_invalid')
  if (!Number.isFinite(min) || min < 0) throw new Error('tarifa_minima_invalid')
  if (!Number.isFinite(extra) || extra < 0) throw new Error('adicional_invalid')
  const raw = km * perKm
  return Math.round((Math.max(raw, min) + extra) * 100) / 100
}
