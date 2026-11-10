/** Valor canônico de motor/versão quando a placa (ou cadastro) não informou. */
export const VEHICLE_NOT_INFORMED_VALUE = ''
export const VEHICLE_NOT_INFORMED_LABEL = 'Não informado'

export function isVehicleNotInformed(value: string | undefined | null): boolean {
  return value === VEHICLE_NOT_INFORMED_VALUE
}

export function toFilterField(value: string | null | undefined, present: boolean): string | undefined {
  if (value != null && String(value).trim()) return String(value).trim()
  // Campo presente mas vazio (ex.: placa sem motor) → "" selecionável
  if (present) return VEHICLE_NOT_INFORMED_VALUE
  return undefined
}

export function withNotInformedOption(
  options: Array<{ value: string; label: string }>,
  value: string | undefined,
): Array<{ value: string; label: string }> {
  if (value === undefined) return options
  if (value === VEHICLE_NOT_INFORMED_VALUE) {
    if (options.some((o) => o.value === VEHICLE_NOT_INFORMED_VALUE)) return options
    return [
      { value: VEHICLE_NOT_INFORMED_VALUE, label: VEHICLE_NOT_INFORMED_LABEL },
      ...options,
    ]
  }
  if (options.some((o) => o.value === value)) return options
  return [{ value, label: `${value} (placa)` }, ...options]
}
