/**
 * Política só de apresentação do OrderOpsSurface.
 * Não executa mutações nem decide legalidade de transição (gates em orderOpsGates).
 *
 * Regra anti-duplicidade (análise):
 * - Em `em_analise` / `aguardando_disponibilidade`, CTAs de resolução ficam só no
 *   OrderAnalysisResolutionPanel (rail = texto + cancel).
 * - Em `aguardando_decisao`, finalize (se autorizado) fica no rail; withdraw no painel.
 * - Em separação, CTAs no rail; sem analysisPanel (evita print duplicado).
 */

import {
  isExpeditionOrLater,
  isInAnalysis,
  isInSeparation,
  isNeedsReception,
} from '@/lib/orderOpsGates'
import type { CustomerDecisionLite } from '@/lib/adminOrderOps'
import type { AnalysisResolutionMode } from '@/lib/orderAnalysisResolution'
import type { UserRole } from '@/types'

export const ORDER_OPS_WAVE = 1 as const
export type OrderOpsWave = 1 | 2

export type OrderOpsBlockId =
  | 'actionRail'
  | 'analysisPanel'
  | 'itemsConferencia'
  | 'itemsSeparacaoPiso'
  | 'itemsInlineOps'
  | 'paymentBlock'
  | 'history'
  | 'wave2Placeholder'
  | 'expeditionSlot'
  | 'packing'
  | 'ownShip'
  | 'meFreight'
  | 'storePickup'

export type OrderOpsActionId =
  | 'start-analysis'
  | 'finalize-to-separation'
  | 'request-customer-decision'
  | 'withdraw-customer-decision'
  | 'cancel-order'
  | 'mark-all-separated'
  | 'complete-separation'
  | 'print-separation'
  | 'authorize-store-pickup'
  | 'confirm-store-pickup'
  | 'open-full'
  | 'copy-id'

export type OrderOpsPresentationInput = {
  status: string
  customerDecision?: CustomerDecisionLite | null
  role?: UserRole | null
  analysisMode?: AnalysisResolutionMode
  shippingKind?: string | null
  /** Retirada na loja (isOrderStorePickup). */
  storePickup?: boolean
  /** Já autorizou “Pronto para retirar”. */
  pickupAuthorized?: boolean
  wave: OrderOpsWave
  /** Capacidade de cancelar (já resolvida via staffCanCancel). */
  canCancel?: boolean
}

export type OrderOpsPresentation = {
  blocks: OrderOpsBlockId[]
  primaryActionId: OrderOpsActionId | null
  secondaryActionIds: OrderOpsActionId[]
  /** Se true, Faça agora mostra só texto (CTAs no painel de análise). */
  pendenciaActionsDeferred: boolean
}

const WAVE2_BLOCKS: OrderOpsBlockId[] = ['packing', 'ownShip', 'meFreight']

export function resolveOrderOpsPresentation(
  input: OrderOpsPresentationInput,
): OrderOpsPresentation {
  const blocks: OrderOpsBlockId[] = ['actionRail', 'paymentBlock', 'history']
  // copy-id no chrome; “Página completa” só no footer do surface (não no menu ⋯).
  const secondary: OrderOpsActionId[] = []
  let primary: OrderOpsActionId | null = null
  let pendenciaActionsDeferred = false

  const { status } = input

  if (isNeedsReception(status)) {
    blocks.push('itemsConferencia')
    primary = 'start-analysis'
  } else if (status === 'em_analise' || status === 'aguardando_disponibilidade') {
    // Caminho análise: um único lugar de CTAs = OrderAnalysisResolutionPanel
    blocks.push('analysisPanel', 'itemsConferencia', 'itemsInlineOps')
    pendenciaActionsDeferred = true
    primary = null
  } else if (status === 'aguardando_decisao') {
    blocks.push('analysisPanel', 'itemsConferencia', 'itemsInlineOps')
    // Finalize só no rail quando cliente autorizou; withdraw só no painel
    primary = 'finalize-to-separation'
    pendenciaActionsDeferred = false
  } else if (isInSeparation(status)) {
    // Sem analysisPanel — evita “Imprimir lista” duplicado com o rail
    blocks.push('itemsSeparacaoPiso', 'itemsInlineOps')
    primary = 'complete-separation'
    secondary.unshift('mark-all-separated', 'print-separation')
  } else if (isExpeditionOrLater(status) || status === 'cancelado') {
    blocks.push('itemsConferencia')
    if (isExpeditionOrLater(status)) {
      // Ações de expedição/retirada no mesmo surface (aba Logística) — planejado.
      blocks.push('expeditionSlot')
      if (input.storePickup) {
        blocks.push('storePickup')
        // CTAs só no StorePickupPanel (aba Logística) — evita rail + painel duplicados.
        primary = null
      }
    }
  } else if (isInAnalysis(status)) {
    blocks.push('analysisPanel', 'itemsConferencia', 'itemsInlineOps')
    pendenciaActionsDeferred = true
  } else {
    blocks.push('itemsConferencia')
  }

  if (input.canCancel && (status === 'aguardando_pagamento' || status === 'aguardando_decisao')) {
    secondary.unshift('cancel-order')
    if (status === 'aguardando_pagamento' && !primary) {
      primary = 'cancel-order'
    }
  }

  if (input.wave >= 2) {
    for (const b of WAVE2_BLOCKS) {
      if (!blocks.includes(b)) blocks.push(b)
    }
  } else if (isExpeditionOrLater(status) && !blocks.includes('expeditionSlot')) {
    blocks.push('wave2Placeholder')
  }

  return {
    blocks: dedupe(blocks),
    primaryActionId: primary,
    secondaryActionIds: dedupe(secondary).filter((id) => id !== primary),
    pendenciaActionsDeferred,
  }
}

function dedupe<T>(arr: T[]): T[] {
  return [...new Set(arr)]
}

/** Mantém helpers do preview legado (print/menu). */
export {
  isAllowedOrderPreviewAction,
  isPdfStubDisabled,
  ORDER_PREVIEW_ACTION_IDS,
  type OrderPreviewActionId,
} from '@/lib/orderPreviewPolicy'
