import type {
  OrderItemAvailability,
  StaffDecisionReasonKind,
} from '@/services/admin/adminOrderService'

export type AnalysisItemSnap = {
  availability: OrderItemAvailability | null
  leadDays?: number | null
}

export type AnalysisResolutionMode =
  | 'incomplete'
  | 'all_ok'
  | 'prazo_only'
  | 'has_unavailable'

export function classifyAnalysisItems(items: AnalysisItemSnap[]): AnalysisResolutionMode {
  if (items.length === 0) return 'incomplete'
  if (items.some((i) => !i.availability)) return 'incomplete'
  const hasUnav = items.some((i) => i.availability === 'indisponivel')
  if (hasUnav) return 'has_unavailable'
  const hasPrazo = items.some((i) => i.availability === 'disponivel_com_prazo')
  if (hasPrazo) return 'prazo_only'
  return 'all_ok'
}

export function defaultProposalText(
  kind: StaffDecisionReasonKind,
  opts?: { leadDays?: number | null; unavailableNames?: string[] },
): string {
  const names = (opts?.unavailableNames ?? []).filter(Boolean)
  const lead = opts?.leadDays
  switch (kind) {
    case 'prazo':
      return lead && lead > 0
        ? `O prazo de entrega será de aproximadamente ${lead} dia(s) úteis (maior que o cotado). Precisamos da sua confirmação para continuar.`
        : 'O prazo de entrega será maior que o cotado. Precisamos da sua confirmação para continuar.'
    case 'parcial':
      return names.length
        ? `O(s) item(ns) indisponível(is): ${names.join(', ')}. Podemos seguir só com os itens disponíveis. O valor do item faltante será tratado pela loja (estorno manual).`
        : 'Há item(ns) indisponível(is). Podemos seguir só com os itens disponíveis. O valor do item faltante será tratado pela loja (estorno manual).'
    case 'escolha':
      return names.length
        ? `Há indisponibilidade (${names.join(', ')}). Escolha: continuar com o disponível, esperar a chegada ou cancelar o pedido.`
        : 'Há divergência no pedido. Escolha: continuar com o disponível, esperar a chegada ou cancelar o pedido.'
    case 'indisponivel':
      return defaultProposalText('parcial', opts)
    case 'obs':
      return 'A loja precisa da sua confirmação sobre uma observação no pedido.'
    default:
      return 'A loja precisa da sua confirmação para seguir com o pedido.'
  }
}

export const REFUND_MANUAL_NOTICE =
  'Estorno do item faltante é manual (fora do sistema nesta fase). Totais do pedido não são recalculados automaticamente.'
