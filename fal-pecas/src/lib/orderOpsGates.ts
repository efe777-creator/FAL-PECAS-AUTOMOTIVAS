import { classifyAnalysisItems, type AnalysisResolutionMode } from '@/lib/orderAnalysisResolution'
import type { CustomerDecisionLite } from '@/lib/adminOrderOps'

export type StaffFinalizeInput = {
  status: string
  customerDecision?: CustomerDecisionLite | null
  analysisMode: AnalysisResolutionMode
}

/** Mesma regra do detalhe admin — uma função para todos os cascos. */
export function canStaffFinalizeAnalysis(input: StaffFinalizeInput): boolean {
  if (input.status === 'aguardando_decisao') {
    return (
      input.customerDecision === 'authorized' ||
      input.customerDecision === 'continue_available'
    )
  }
  return input.analysisMode === 'all_ok' || input.analysisMode === 'prazo_only'
}

export function analysisModeFromItems(
  items: { availability: string | null; leadDays?: number | null }[],
): AnalysisResolutionMode {
  return classifyAnalysisItems(
    items.map((i) => ({
      availability: i.availability as Parameters<typeof classifyAnalysisItems>[0][number]['availability'],
      leadDays: i.leadDays,
    })),
  )
}

export function isNeedsReception(status: string): boolean {
  return status === 'pagamento_aprovado' || status === 'recebido'
}

export function isInAnalysis(status: string): boolean {
  return ['em_analise', 'aguardando_disponibilidade', 'aguardando_decisao'].includes(status)
}

export function isInSeparation(status: string): boolean {
  return status === 'confirmado' || status === 'em_separacao'
}

export function isExpeditionOrLater(status: string): boolean {
  return ['pronto_para_envio', 'preparando_envio', 'enviado', 'entregue'].includes(status)
}

export function finalizeBlockedReason(
  input: StaffFinalizeInput,
): string | undefined {
  if (canStaffFinalizeAnalysis(input)) return undefined
  if (input.analysisMode === 'incomplete') return 'Defina a disponibilidade de todos os itens'
  if (input.analysisMode === 'has_unavailable') {
    return 'Com item indisponível: peça decisão ao cliente ou espere a chegada'
  }
  return 'Aguarde o cliente ou retire a solicitação'
}
