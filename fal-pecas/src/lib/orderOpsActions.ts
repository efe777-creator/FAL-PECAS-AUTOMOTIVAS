/**
 * Único entrypoint de mutações do OrderOpsSurface (I1/I2/I3).
 * Cascos não chamam adminCancel / adminFinalize diretamente.
 */

import { orderConfirmationResultLabel } from '@/lib/orderLifecycle'
import { orderStatusOperatorLabel } from '@/lib/adminOrderOps'
import { toUserMessage } from '@/lib/toUserMessage'
import {
  adminAdvanceOrder,
  adminAuthorizeStorePickup,
  adminCancelOrder,
  adminCompleteSeparation,
  adminConfirmStorePickup,
  adminFinalizeConfirmation,
  adminHoldForAvailability,
  adminPostSaleCaseAction,
  adminRequestCustomerDecision,
  adminSetItemAvailability,
  adminSetItemSeparated,
  adminWithdrawCustomerDecisionRequest,
  staffCanCancel,
  type OrderItemAvailability,
  type StaffDecisionReasonKind,
} from '@/services/admin/adminOrderService'

export type OrderOpsActionFeedback = {
  ok: (message: string) => void
  error: (message: string) => void
}

/** Mutex in-memory por processo UI — anti duplo clique (I3). */
export function createOrderOpsActionRunner() {
  let inFlight = false

  async function runExclusive<T>(fn: () => Promise<T>): Promise<T | undefined> {
    if (inFlight) return undefined
    inFlight = true
    try {
      return await fn()
    } finally {
      inFlight = false
    }
  }

  function isBusy() {
    return inFlight
  }

  return { runExclusive, isBusy }
}

export type OrderOpsActionRunner = ReturnType<typeof createOrderOpsActionRunner>

export async function actionStartAnalysis(
  runner: OrderOpsActionRunner,
  orderId: string,
  status: string,
  fb: OrderOpsActionFeedback,
): Promise<boolean> {
  const result = await runner.runExclusive(async () => {
    let st = status
    if (st === 'pagamento_aprovado') {
      await adminAdvanceOrder(orderId, 'recebido', 'Recepção operacional', 'order_received')
      st = 'recebido'
    }
    if (st === 'recebido') {
      await adminAdvanceOrder(
        orderId,
        'em_analise',
        'Início da análise de disponibilidade',
        'confirmation_started',
      )
    }
    fb.ok('Análise iniciada')
    return true
  })
  return result === true
}

export async function actionFinalizeToSeparation(
  runner: OrderOpsActionRunner,
  orderId: string,
  fb: OrderOpsActionFeedback,
): Promise<boolean> {
  const result = await runner.runExclusive(async () => {
    const r = await adminFinalizeConfirmation(orderId)
    fb.ok(
      `Resultado: ${orderConfirmationResultLabel(r.result)} → ${orderStatusOperatorLabel[r.status] ?? r.status}`,
    )
    return true
  })
  return result === true
}

export async function actionCancelOrder(
  runner: OrderOpsActionRunner,
  orderId: string,
  note: string,
  fb: OrderOpsActionFeedback,
): Promise<boolean> {
  const trimmed = note.trim()
  if (!trimmed) {
    fb.error('Informe o motivo do cancelamento.')
    return false
  }
  const result = await runner.runExclusive(async () => {
    // I2: revalida permissão no handler, não só na UI
    const allowed = await staffCanCancel()
    if (!allowed) {
      fb.error('Sem permissão para cancelar pedidos.')
      return false
    }
    await adminCancelOrder(orderId, trimmed)
    fb.ok('Pedido cancelado')
    return true
  })
  return result === true
}

export async function actionRequestCustomerDecision(
  runner: OrderOpsActionRunner,
  orderId: string,
  kind: StaffDecisionReasonKind,
  reasonText: string,
  fb: OrderOpsActionFeedback,
  proposal?: Record<string, unknown>,
): Promise<boolean> {
  const result = await runner.runExclusive(async () => {
    await adminRequestCustomerDecision(orderId, kind, reasonText, proposal ?? null)
    fb.ok('Confirmação solicitada ao cliente')
    return true
  })
  return result === true
}

export async function actionWithdrawCustomerDecision(
  runner: OrderOpsActionRunner,
  orderId: string,
  reason: string | undefined,
  fb: OrderOpsActionFeedback,
): Promise<boolean> {
  const result = await runner.runExclusive(async () => {
    await adminWithdrawCustomerDecisionRequest(orderId, reason)
    fb.ok('Solicitação retirada — pedido em análise')
    return true
  })
  return result === true
}

export async function actionHoldForAvailability(
  runner: OrderOpsActionRunner,
  orderId: string,
  waitDays: number | null,
  note: string,
  fb: OrderOpsActionFeedback,
): Promise<boolean> {
  const result = await runner.runExclusive(async () => {
    await adminHoldForAvailability(orderId, waitDays, note || null)
    fb.ok('Pedido em aguardando disponibilidade')
    return true
  })
  return result === true
}

export async function actionSetItemSeparated(
  runner: OrderOpsActionRunner,
  orderItemId: string,
  separated: boolean,
): Promise<boolean> {
  const result = await runner.runExclusive(async () => {
    await adminSetItemSeparated(orderItemId, separated)
    return true
  })
  return result === true
}

export async function actionMarkAllSeparated(
  runner: OrderOpsActionRunner,
  itemIds: string[],
  fb: OrderOpsActionFeedback,
): Promise<boolean> {
  if (itemIds.length === 0) return false
  const result = await runner.runExclusive(async () => {
    for (const id of itemIds) {
      await adminSetItemSeparated(id, true)
    }
    fb.ok(`${itemIds.length} item(ns) marcado(s) como separado(s).`)
    return true
  })
  return result === true
}

export async function actionCompleteSeparation(
  runner: OrderOpsActionRunner,
  orderId: string,
  fb: OrderOpsActionFeedback,
): Promise<boolean> {
  const result = await runner.runExclusive(async () => {
    await adminCompleteSeparation(orderId)
    fb.ok('Separação concluída')
    return true
  })
  return result === true
}

export async function actionAuthorizeStorePickup(
  runner: OrderOpsActionRunner,
  orderId: string,
  fb: OrderOpsActionFeedback,
): Promise<boolean> {
  const result = await runner.runExclusive(async () => {
    const r = await adminAuthorizeStorePickup(orderId)
    fb.ok(
      r.already
        ? 'Retirada já estava autorizada — cliente já vê Pronto para retirar.'
        : 'Retirada autorizada — cliente avisado (Pronto para retirar).',
    )
    return true
  })
  return result === true
}

export async function actionConfirmStorePickup(
  runner: OrderOpsActionRunner,
  orderId: string,
  proof: string | undefined,
  fb: OrderOpsActionFeedback,
): Promise<boolean> {
  const result = await runner.runExclusive(async () => {
    await adminConfirmStorePickup(orderId, proof?.trim() || undefined)
    fb.ok('Cliente retirou — pedido entregue.')
    return true
  })
  return result === true
}

export async function actionSetItemAvailability(
  runner: OrderOpsActionRunner,
  input: {
    orderItemId: string
    availability: OrderItemAvailability
    leadDays: number | null
    staffNote: string | null
  },
  fb: OrderOpsActionFeedback,
): Promise<boolean> {
  const result = await runner.runExclusive(async () => {
    await adminSetItemAvailability(input)
    fb.ok('Disponibilidade salva')
    return true
  })
  return result === true
}

export function actionErrorMessage(e: unknown, fallback: string): string {
  return toUserMessage(e, fallback)
}

/** F3 — stages do caso pós-venda (OrderOps / ocorrências). */
export async function actionPostSaleCase(
  runner: OrderOpsActionRunner,
  input: {
    orderId: string
    occurrenceId: string
    action:
      | 'start'
      | 'authorize'
      | 'refuse'
      | 'awaiting_piece'
      | 'conference'
      | 'resolve'
      | 'reopen'
    returnMode?: 'me_codigo' | 'wa' | 'loja' | null
    note?: string | null
    serviceOverride?: 'pac' | 'sedex' | null
    solucao?: string | null
  },
  fb: OrderOpsActionFeedback,
): Promise<boolean> {
  const result = await runner.runExclusive(async () => {
    const r = await adminPostSaleCaseAction(input)
    const labels: Record<string, string> = {
      start: 'Caso em análise',
      authorize: 'Devolução autorizada',
      refuse: 'Solicitação recusada',
      awaiting_piece: 'Aguardando peça',
      conference: 'Em conferência',
      resolve: 'Caso resolvido',
      reopen: 'Caso reaberto',
    }
    fb.ok(labels[input.action] ?? `Stage: ${r.stage}`)
    return true
  })
  return result === true
}
