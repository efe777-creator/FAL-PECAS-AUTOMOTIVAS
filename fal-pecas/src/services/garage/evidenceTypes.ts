export const EVIDENCE_TYPES = [
  'nf',
  'os',
  'recibo',
  'foto',
  'video',
  'laudo',
  'doc_tecnico',
  'comprovante_compra',
  'comprovante_instalacao',
  'registro_km',
  'outro',
] as const

export type EvidenceType = (typeof EVIDENCE_TYPES)[number]

export const EVIDENCE_TYPE_LABEL: Record<EvidenceType, string> = {
  nf: 'Nota fiscal',
  os: 'Ordem de serviço',
  recibo: 'Recibo',
  foto: 'Foto',
  video: 'Vídeo',
  laudo: 'Laudo',
  doc_tecnico: 'Documento técnico',
  comprovante_compra: 'Comprovante de compra',
  comprovante_instalacao: 'Comprovante de instalação',
  registro_km: 'Registro de km',
  outro: 'Outro',
}

export const EVIDENCE_VISIBILITIES = [
  'private_owner',
  'period',
  'shared',
  'public_vehicle',
] as const

export type EvidenceVisibility = (typeof EVIDENCE_VISIBILITIES)[number]

export const EVIDENCE_VISIBILITY_LABEL: Record<EvidenceVisibility, string> = {
  private_owner: 'Privado do dono',
  period: 'Período de propriedade',
  shared: 'Compartilhado',
  public_vehicle: 'Fato do veículo (sem PII)',
}

export const VEHICLE_EVIDENCE_BUCKET = 'vehicle-evidence'
export const VEHICLE_EVIDENCE_SIGNED_TTL_SEC = 300

/** Desvincular de evento ≠ apagar arquivo. */
export function unlinkDoesNotDeleteFile(): true {
  return true
}
