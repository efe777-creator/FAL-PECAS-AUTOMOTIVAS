/**
 * Frete próprio v2 — fórmula APROVADA (piso):
 * frete = max(distanceKmOneWay * valorPorKm, tarifaMinima)
 * Distância = só ida. Sem adicionais na v1.
 */
export function computeOwnFreightAmount(input: {
  distanceKmOneWay: number
  valorPorKm: number
  tarifaMinima: number
}): number {
  const km = Number(input.distanceKmOneWay)
  const perKm = Number(input.valorPorKm)
  const min = Number(input.tarifaMinima)
  if (!Number.isFinite(km) || km < 0) throw new Error('distance_km_invalid')
  if (!Number.isFinite(perKm) || perKm < 0) throw new Error('valor_por_km_invalid')
  if (!Number.isFinite(min) || min < 0) throw new Error('tarifa_minima_invalid')
  const raw = km * perKm
  return Math.round(Math.max(raw, min) * 100) / 100
}
