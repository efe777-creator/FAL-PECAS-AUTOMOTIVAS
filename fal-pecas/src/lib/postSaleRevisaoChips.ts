/** Chips da visão Revisão (D12). */

import {
  POST_SALE_RETURN_MODE_LABEL,
  POST_SALE_STAGE_LABEL,
  asPostSaleReturnMode,
  asPostSaleStage,
} from '@/lib/postSaleStages'

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
  returnMode?: string | null
  trackingCode?: string | null
}

export function revisaoTipoLabel(tipo: string | null | undefined): string {
  const t = String(tipo ?? '').toLowerCase()
  if (t === 'pos_venda_devolucao') return 'Devolução'
  if (t === 'pos_venda_incompat') return 'Incompatibilidade'
  if (t === 'pos_venda_suporte' || t === 'pos_venda') return 'Suporte'
  if (t === 'pos_entrega') return 'Pós-entrega'
  if (!t) return 'Revisão'
  return t
}

export function revisaoStageLabel(stage: string | null | undefined): string {
  const st = asPostSaleStage(stage)
  if (st) return POST_SALE_STAGE_LABEL[st]
  if (stage) return String(stage)
  return '—'
}

export function revisaoModeCodeLabel(meta: RevisaoRowMeta | null | undefined): string {
  if (!meta) return '—'
  const code = String(meta.trackingCode ?? '').trim()
  const rm = asPostSaleReturnMode(meta.returnMode)
  if (code && rm) return `${POST_SALE_RETURN_MODE_LABEL[rm]} · ${code}`
  if (code) return code
  if (rm) return POST_SALE_RETURN_MODE_LABEL[rm]
  return '—'
}

/** Próxima ação tipada para coluna Faça agora (fila revisão). */
export function revisaoNextActionLabel(meta: RevisaoRowMeta | null | undefined): string {
  if (!meta) return 'Abrir guia'
  if (meta.source === 'manual_review') return 'Resolver revisão manual'
  const stage = asPostSaleStage(meta.stage)
  if (!stage || stage === 'aberto') return 'Colocar em análise'
  if (stage === 'em_analise') return 'Autorizar ou recusar'
  if (stage === 'autorizada') {
    if (meta.returnMode === 'me_codigo' && !meta.trackingCode) return 'Aguardando código cliente'
    if (meta.returnMode === 'wa') return 'Orientar postagem WA'
    if (meta.returnMode === 'loja') return 'Aguardar na loja'
    return 'Aguardando peça'
  }
  if (stage === 'aguardando_peca') return 'Conferir peça'
  if (stage === 'em_conferencia') return 'Resolver conferência'
  if (stage === 'recusada') return 'Encerrar / orientar'
  return 'Abrir guia'
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
