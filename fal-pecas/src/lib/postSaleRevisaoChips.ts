/** Chips da visão Revisão (D12). */

export type RevisaoChipId = 'todas' | 'suporte' | 'devolucao' | 'aguardando'

export const REVISAO_CHIPS: { id: RevisaoChipId; label: string }[] = [
  { id: 'todas', label: 'Todas' },
  { id: 'suporte', label: 'Suporte' },
  { id: 'devolucao', label: 'Devolução / incompat.' },
  { id: 'aguardando', label: 'Aguardando ops' },
]

export type RevisaoRowMeta = {
  source: 'occurrence' | 'manual_review'
  tipo?: string | null
  stage?: string | null
  lastEventType?: string | null
}

/** Chip primário da linha (para filtro). */
export function revisaoChipForRow(meta: RevisaoRowMeta): Exclude<RevisaoChipId, 'todas'> {
  if (meta.source === 'manual_review') return 'aguardando'
  // F3: peça a caminho / conferência = fila operacional (não “só suporte”).
  const stage = String(meta.stage ?? '').toLowerCase()
  if (stage === 'aguardando_peca' || stage === 'em_conferencia') {
    return 'aguardando'
  }
  const tipo = String(meta.tipo ?? '').toLowerCase()
  if (
    tipo === 'pos_venda_devolucao' ||
    tipo === 'pos_venda_incompat' ||
    tipo.includes('devoluc')
  ) {
    return 'devolucao'
  }
  if (
    tipo === 'pos_venda_suporte' ||
    tipo === 'pos_entrega' ||
    tipo === 'atraso' ||
    tipo === 'pos_venda'
  ) {
    return 'suporte'
  }
  // Demais ocorrências abertas entram em aguardando ops
  return 'aguardando'
}

export function rowMatchesRevisaoChip(
  chip: RevisaoChipId,
  meta: RevisaoRowMeta | null | undefined,
): boolean {
  if (chip === 'todas') return true
  if (!meta) return chip === 'aguardando'
  return revisaoChipForRow(meta) === chip
}
