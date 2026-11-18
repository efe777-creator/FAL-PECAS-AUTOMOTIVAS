export const VEHICLE_EVENT_CATEGORIES = [
  'aquisicao',
  'transferencia',
  'manutencao',
  'reparo',
  'inspecao',
  'compra_pecas',
  'recebimento',
  'instalacao',
  'substituicao',
  'modificacao',
  'documentacao',
  'quilometragem',
  'outro',
] as const

export type VehicleEventCategory = (typeof VEHICLE_EVENT_CATEGORIES)[number]

export const VEHICLE_EVENT_CATEGORY_LABEL: Record<VehicleEventCategory, string> = {
  aquisicao: 'Aquisição',
  transferencia: 'Transferência',
  manutencao: 'Manutenção',
  reparo: 'Reparo',
  inspecao: 'Inspeção',
  compra_pecas: 'Compra de peças',
  recebimento: 'Recebimento',
  instalacao: 'Instalação',
  substituicao: 'Substituição',
  modificacao: 'Modificação',
  documentacao: 'Documentação',
  quilometragem: 'Quilometragem',
  outro: 'Outro',
}

export const VEHICLE_VALIDATION_STATES = [
  'declarado',
  'documentado',
  'confirmado',
  'verificado',
  'contestado',
  'retificado',
  'rejeitado',
] as const

export type VehicleValidationState = (typeof VEHICLE_VALIDATION_STATES)[number]

export const VEHICLE_VALIDATION_LABEL: Record<VehicleValidationState, string> = {
  declarado: 'Declarado',
  documentado: 'Documentado',
  confirmado: 'Confirmado',
  verificado: 'Verificado',
  contestado: 'Contestado',
  retificado: 'Retificado',
  rejeitado: 'Rejeitado',
}

/** Mapeamento G7 → categoria timeline (compra ≠ instalação). */
export function g7TypeToCategory(
  eventType: string,
): VehicleEventCategory {
  switch (eventType) {
    case 'bought':
    case 'associated':
      return 'compra_pecas'
    case 'awaiting_install':
      return 'compra_pecas'
    case 'installed_declared':
      return 'instalacao'
    case 'returned':
      return 'substituicao'
    case 'corrected':
      return 'outro'
    case 'disassociated':
      return 'outro'
    default:
      return 'outro'
  }
}
