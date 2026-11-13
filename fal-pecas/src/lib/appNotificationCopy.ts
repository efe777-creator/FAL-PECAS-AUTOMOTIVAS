/** Espelho PT-BR do SQL app_notification_copy (status + retirada). */

export type AppNotificationCopy = {
  title: string
  body: string
}

export function appNotificationCopy(
  kind: string,
  opts?: { pickup?: boolean; reasonText?: string | null; note?: string | null; source?: string | null },
): AppNotificationCopy | null {
  const k = kind.trim().toLowerCase()
  const pickup = Boolean(opts?.pickup)

  if (k === 'pickup_authorized') {
    return {
      title: 'Pronto para retirar na loja',
      body: 'A loja liberou a retirada. Leve documento e o número do pedido.',
    }
  }
  if (k === 'order_shipped' && pickup) {
    return {
      title: 'Pronto para retirar',
      body: 'Seu pedido está disponível para retirada na loja.',
    }
  }
  if (k === 'order_delivered' && pickup) {
    return {
      title: 'Retirada feita',
      body: 'A retirada do pedido na loja foi registrada.',
    }
  }
  if (k === 'separation_completed' && pickup) {
    return {
      title: 'Separação concluída',
      body: 'Aguardando liberação da retirada pela loja.',
    }
  }

  switch (k) {
    case 'payment_approved':
      return { title: 'Pagamento aprovado', body: 'Recebemos o pagamento do seu pedido.' }
    case 'payment_failed':
      return {
        title: 'Pagamento não aprovado',
        body: 'O pagamento não foi aprovado. Você pode tentar novamente no pedido.',
      }
    case 'order_received':
      return { title: 'Pedido recebido pela loja', body: 'A FAL recebeu o pedido e vai analisar.' }
    case 'analysis_started':
      return { title: 'Loja analisando o pedido', body: 'Sua compra está em análise pela loja.' }
    case 'order_confirmed':
      return { title: 'Pedido confirmado', body: 'A loja confirmou o pedido.' }
    case 'order_sent_to_separation':
      return { title: 'Pedido em separação', body: 'A loja começou a separar os itens.' }
    case 'separation_started':
      return { title: 'Separação iniciada', body: 'Os itens do pedido estão sendo separados.' }
    case 'separation_completed':
      return { title: 'Separação concluída', body: 'A loja concluiu a separação do pedido.' }
    case 'order_shipped':
      return {
        title: 'Pedido enviado',
        body: 'Seu pedido foi despachado. Acompanhe o rastreio no detalhe.',
      }
    case 'order_delivered':
      return { title: 'Pedido entregue', body: 'A entrega do pedido foi confirmada.' }
    case 'order_cancelled':
      return { title: 'Pedido cancelado', body: 'O pedido foi cancelado.' }
    case 'order_expired_unpaid':
      return {
        title: 'Pedido expirado sem pagamento',
        body: 'O prazo para pagar o pedido acabou e ele foi cancelado.',
      }
    case 'order_awaiting_decision':
    case 'staff_requested_customer_decision':
      return {
        title: 'Ação necessária — decisão do pedido',
        body: opts?.reasonText?.trim() || 'Abra o pedido para continuar, esperar ou cancelar.',
      }
    case 'staff_held_for_availability':
      return {
        title: 'Pedido aguardando disponibilidade',
        body: opts?.note?.trim() || 'A loja aguarda a chegada de item(ns).',
      }
    case 'staff_updated_eta_and_confirmed':
      return {
        title: 'Prazo atualizado e pedido confirmado',
        body: 'A loja atualizou o prazo e liberou o pedido para separação.',
      }
    case 'shipment_tracking_updated':
      return {
        title: 'Rastreio atualizado',
        body: 'Há um novo código ou link de rastreio no detalhe do pedido.',
      }
    case 'customer_chose_continue_available':
      return {
        title: 'Confirmação recebida',
        body: 'Recebemos sua confirmação. A loja vai liberar o pedido para separação.',
      }
    case 'customer_chose_wait_arrival':
      return {
        title: 'Você pediu para esperar',
        body: 'Aguardaremos a disponibilidade; a loja retomará o pedido.',
      }
    case 'customer_chose_cancel':
      return {
        title: 'Cancelamento solicitado',
        body: 'Recebemos seu pedido de cancelamento. A loja vai analisar.',
      }
    case 'order_confirmed_with_caveat':
      return {
        title: 'Pedido confirmado',
        body: 'A loja confirmou o pedido (com prazo atualizado).',
      }
    case 'cancellation_approved':
      return {
        title: 'Cancelamento aprovado',
        body: 'A loja aprovou o cancelamento do pedido.',
      }
    case 'cancellation_rejected':
      return {
        title: 'Cancelamento recusado',
        body: 'A loja recusou a solicitação de cancelamento.',
      }
    case 'cancellation_requested':
      return {
        title: 'Cliente pediu cancelamento',
        body: 'Há uma solicitação de cancelamento para analisar.',
      }
    case 'customer_authorized_changes':
      return {
        title: 'Cliente aprovou — liberar separação',
        body: 'O cliente autorizou. Finalize a confirmação e envie o pedido para separação.',
      }
    case 'customer_rejected_changes':
      return {
        title: 'Cliente recusou alterações',
        body: 'O cliente recusou. Renegocie ou cancele o pedido.',
      }
    case 'customer_receipt_confirmed':
      return {
        title: 'Cliente confirmou o recebimento',
        body: 'O cliente marcou o pedido como recebido.',
      }
    case 'occurrence_opened':
      if ((opts?.source ?? '').toLowerCase() !== 'customer') return null
      return {
        title: 'Cliente reportou problema',
        body: opts?.note?.trim() || 'Abra o pedido / ocorrência.',
      }
    default:
      return null
  }
}

export function appNotificationHref(orderId: string, audience: 'customer' | 'staff'): string {
  return audience === 'staff' ? `/admin/pedidos/${orderId}` : `/conta/pedidos/${orderId}`
}

/** Kinds que exigem decisão do cliente (selo Ação necessária). */
const ACTIONABLE_CUSTOMER_KINDS = new Set([
  'order_awaiting_decision',
  'staff_requested_customer_decision',
])

/** Kinds que exigem ação do operador. */
const ACTIONABLE_STAFF_KINDS = new Set([
  'cancellation_requested',
  'customer_chose_continue_available',
  'customer_chose_wait_arrival',
  'customer_chose_cancel',
  'customer_authorized_changes',
  'customer_rejected_changes',
  'occurrence_opened',
])

export function isActionableNotificationKind(
  kind: string,
  audience: 'customer' | 'staff' = 'customer',
): boolean {
  const k = kind.trim().toLowerCase()
  return audience === 'staff' ? ACTIONABLE_STAFF_KINDS.has(k) : ACTIONABLE_CUSTOMER_KINDS.has(k)
}

/** Prefer coluna DB (N2); fallback pelo kind (N1). */
export function notificationNeedsAction(opts: {
  kind: string
  audience: 'customer' | 'staff'
  actionable?: boolean | null
}): boolean {
  if (opts.actionable === true) return true
  if (opts.actionable === false) return false
  return isActionableNotificationKind(opts.kind, opts.audience)
}

/** Href de navegação: âncora #decisao para ações do cliente. */
export function resolveNotificationNavHref(opts: {
  href: string
  kind: string
  audience: 'customer' | 'staff'
}): string {
  const base = opts.href.split('#')[0]
  if (opts.audience === 'customer' && isActionableNotificationKind(opts.kind, 'customer')) {
    return `${base}#decisao`
  }
  return opts.href.includes('#') ? opts.href : base
}
