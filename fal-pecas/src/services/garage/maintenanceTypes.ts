export const MAINTENANCE_TYPES = [
  'preventiva',
  'corretiva',
  'preditiva',
  'inspecao',
  'emergencia',
  'instalacao',
  'substituicao',
  'modificacao',
] as const

export type MaintenanceType = (typeof MAINTENANCE_TYPES)[number]

export const MAINTENANCE_TYPE_LABEL: Record<MaintenanceType, string> = {
  preventiva: 'Preventiva',
  corretiva: 'Corretiva',
  preditiva: 'Preditiva',
  inspecao: 'Inspeção',
  emergencia: 'Emergência',
  instalacao: 'Instalação',
  substituicao: 'Substituição',
  modificacao: 'Modificação',
}

/** Instalação nunca nasce de compra — só de registro explícito de manutenção. */
export function maintenanceCreatesInstallation(type: MaintenanceType): boolean {
  return type === 'instalacao'
}
