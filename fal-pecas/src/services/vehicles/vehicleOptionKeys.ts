/** Chaves compostas para evitar colisão de modelos homônimos entre montadoras. */

export function vehicleModelKey(maker: string, model: string): string {
  return `${maker}|${model}`
}

export function vehicleModelYearKey(maker: string, model: string, year: string | number): string {
  return `${maker}|${model}|${year}`
}

/** Extrai modelo de uma chave `maker|model` ou `maker|model|year`. */
export function modelFromVehicleKey(key: string): string {
  const parts = key.split('|')
  return parts[1] ?? key
}
