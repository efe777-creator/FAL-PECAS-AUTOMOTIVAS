import {
  adminActorKind,
  adminNextActionLabel,
  orderStatusOperatorLabel,
  type CustomerDecisionLite,
} from '@/lib/adminOrderOps'
import { adminOrderNextStep } from '@/lib/orderLifecycle'

/**
 * Taxonomia de apresentação — não é state machine.
 * status = order.status; substatus = derivado; pendência = Faça agora.
 */

export type OrderOpsSubstatus = {
  id: string
  label: string
} | null

export type OrderOpsPendencia = {
  title: string
  body?: string
}

export function resolveOrderOpsSubstatus(input: {
  status: string
  customerDecision?: CustomerDecisionLite | null
}): OrderOpsSubstatus {
  const decision = input.customerDecision
  if (input.status === 'aguardando_decisao' && decision) {
    if (decision === 'authorized' || decision === 'continue_available') {
      return { id: 'customer_authorized', label: 'Cliente autorizou' }
    }
    if (decision === 'rejected' || decision === 'cancel_order') {
      return { id: 'customer_cancel', label: 'Cliente pediu cancelamento' }
    }
    if (decision === 'wait_arrival') {
      return { id: 'customer_wait', label: 'Cliente pediu espera' }
    }
    return { id: 'awaiting_customer', label: 'Aguardando cliente' }
  }
  const actor = adminActorKind(input.status, decision ?? undefined)
  if (actor === 'customer') return { id: 'actor_customer', label: 'Ação do cliente' }
  if (actor === 'wait_payment') return { id: 'wait_payment', label: 'Aguardando pagamento' }
  return null
}

export function resolveOrderOpsPendencia(input: {
  status: string
  customerDecision?: CustomerDecisionLite | null
  pickup?: boolean
  pickupAuthorized?: boolean
  shippingKind?: string | null
}): OrderOpsPendencia {
  if (input.status === 'aguardando_decisao') {
    return {
      title: adminNextActionLabel(input.status, input.customerDecision ?? undefined),
      body:
        input.customerDecision === 'authorized' ||
        input.customerDecision === 'continue_available'
          ? 'Cliente autorizou. Finalize a confirmação para separar.'
          : input.customerDecision === 'rejected' ||
              input.customerDecision === 'cancel_order'
            ? 'Cliente pediu cancelamento. Analise antes de confirmar.'
            : input.customerDecision === 'wait_arrival'
              ? 'Cliente pediu espera — retome quando houver estoque.'
              : 'Aguarde a resposta do cliente.',
    }
  }
  if (
    input.pickup &&
    input.pickupAuthorized &&
    ['pronto_para_envio', 'preparando_envio', 'enviado'].includes(input.status)
  ) {
    return {
      title: 'Aguardando cliente na loja',
      body: 'Retirada autorizada. Quando o cliente buscar, use “Cliente retirou” na aba Logística.',
    }
  }
  const raw = input.shippingKind
  const shippingKind =
    raw === 'own' || raw === 'melhorenvio' || raw === 'mock' || raw === 'unknown'
      ? raw
      : 'unknown'
  const step = adminOrderNextStep(input.status, {
    pickup: input.pickup,
    shippingKind,
  })
  if (step) return { title: step.title, body: step.body }
  return {
    title: adminNextActionLabel(input.status, input.customerDecision ?? undefined),
  }
}

export function statusOperatorLabel(status: string): string {
  return orderStatusOperatorLabel[status] ?? status
}
