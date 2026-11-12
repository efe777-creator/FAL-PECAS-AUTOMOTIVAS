/** Projeção e labels do ciclo de pedido (F6D / F7A). */

export type OrderInternalStatus =
  | 'pendente'
  | 'aguardando_pagamento'
  | 'pagamento_aprovado'
  | 'recebido'
  | 'em_analise'
  | 'aguardando_disponibilidade'
  | 'aguardando_decisao'
  | 'confirmado'
  | 'em_separacao'
  | 'pronto_para_envio'
  | 'preparando_envio'
  | 'enviado'
  | 'entregue'
  | 'cancelado'

export type OrderCustomerStep =
  | 'pedido_realizado'
  | 'aguardando_pagamento'
  | 'pagamento_aprovado'
  | 'recebido_pela_fal'
  | 'em_confirmacao'
  | 'separacao'
  | 'enviado'
  | 'entregue'
  | 'cancelado'

export type TimelineStepState = 'done' | 'current' | 'todo'

export interface CustomerTimelineStep {
  id: OrderCustomerStep
  label: string
  state: TimelineStepState
}

const HAPPY_PATH: { id: OrderCustomerStep; label: string }[] = [
  { id: 'pedido_realizado', label: 'Pedido realizado' },
  { id: 'aguardando_pagamento', label: 'Pendente de pagamento' },
  { id: 'pagamento_aprovado', label: 'Pagamento aprovado' },
  /** Um único passo comercial — evita duplicar "Aguardando confirmação da loja". */
  { id: 'em_confirmacao', label: 'Aguardando confirmação da loja' },
  { id: 'separacao', label: 'Em separação / postagem' },
  { id: 'enviado', label: 'Enviado' },
  { id: 'entregue', label: 'Entregue' },
]

/** Mapa status interno → step cliente ativo (F6D §7.2). */
export function mapStatusToCustomerStep(status: string): OrderCustomerStep {
  switch (status) {
    case 'pendente':
    case 'aguardando_pagamento':
      return 'aguardando_pagamento'
    case 'pagamento_aprovado':
      return 'pagamento_aprovado'
    case 'recebido':
    case 'em_analise':
    case 'aguardando_disponibilidade':
    case 'aguardando_decisao':
      return 'em_confirmacao'
    case 'confirmado':
      return 'separacao'
    case 'em_separacao':
    case 'pronto_para_envio':
    case 'preparando_envio':
      return 'separacao'
    case 'enviado':
      return 'enviado'
    case 'entregue':
      return 'entregue'
    case 'cancelado':
      return 'cancelado'
    default:
      return 'em_confirmacao'
  }
}

export function projectCustomerTimeline(
  status: string,
  opts?: { pickup?: boolean; pickupAuthorized?: boolean },
): CustomerTimelineStep[] {
  if (status === 'cancelado') {
    return [
      { id: 'pedido_realizado', label: 'Pedido realizado', state: 'done' },
      { id: 'cancelado', label: 'Pedido cancelado', state: 'current' },
    ]
  }

  const pickup = Boolean(opts?.pickup)
  const pickupAuthorized = Boolean(opts?.pickupAuthorized)
  const path = HAPPY_PATH.map((s) => {
    if (!pickup) return s
    if (s.id === 'separacao') return { ...s, label: 'Em separação' }
    if (s.id === 'enviado') return { ...s, label: 'Pronto para retirar' }
    if (s.id === 'entregue') return { ...s, label: 'Retirada feita' }
    return s
  })

  let current = mapStatusToCustomerStep(status)
  // Retirada autorizada ainda em pronto_para_envio → passo "Pronto para retirar"
  if (
    pickup &&
    pickupAuthorized &&
    (status === 'pronto_para_envio' || status === 'preparando_envio')
  ) {
    current = 'enviado'
  }

  let activeIndex = path.findIndex((s) => s.id === current)
  if (activeIndex < 0) activeIndex = 0

  // confirmado: loja já aprovou — "confirmação" done; atual = separação (ainda não iniciada)
  if (status === 'confirmado') {
    activeIndex = path.findIndex((s) => s.id === 'separacao')
  }

  return path.map((s, i) => ({
    id: s.id,
    label: s.label,
    state: i < activeIndex ? 'done' : i === activeIndex ? 'current' : 'todo',
  }))
}

/** Labels comerciais para a área do cliente (conta / timeline). */
export const orderStatusLabel: Record<string, string> = {
  pendente: 'Pendente',
  aguardando_pagamento: 'Pendente de pagamento',
  pagamento_aprovado: 'Pagamento aprovado',
  recebido: 'Aguardando confirmação da loja',
  em_analise: 'Aguardando confirmação da loja',
  aguardando_disponibilidade: 'Aguardando confirmação da loja',
  aguardando_decisao: 'Aguardando sua autorização',
  confirmado: 'Aprovado pela loja',
  em_separacao: 'Em separação',
  pronto_para_envio: 'Aguardando postagem',
  preparando_envio: 'Aguardando postagem',
  enviado: 'Enviado',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
}

type CustomerStatusCtx = {
  status: string
  pickup?: boolean
  pickupAuthorized?: boolean
}

/** Label cliente ciente de retirada / autorização. */
export function customerFacingOrderStatusLabel(ctx: CustomerStatusCtx): string {
  const { status, pickup, pickupAuthorized } = ctx
  if (pickup) {
    if (status === 'entregue') return 'Retirado na loja'
    if (status === 'enviado') return 'Pronto para retirar'
    if (
      (status === 'pronto_para_envio' || status === 'preparando_envio') &&
      pickupAuthorized
    ) {
      return 'Pronto para retirar'
    }
    if (status === 'pronto_para_envio' || status === 'preparando_envio') {
      return 'Separação concluída — aguardando liberação da retirada'
    }
    if (status === 'em_separacao') return 'Em separação'
  }
  return orderStatusLabel[status] ?? status
}

type CustomerListCtaOpts = {
  pickup?: boolean
  pickupAuthorized?: boolean
}

/** CTA principal na lista Meus pedidos (ação que o cliente precisa ver agora). */
export function customerOrderListCta(
  status: string,
  opts?: CustomerListCtaOpts,
): string | null {
  if (status === 'aguardando_pagamento') return 'Continuar pagamento →'
  if (status === 'aguardando_decisao') return 'Responder loja →'
  if (
    opts?.pickup &&
    opts.pickupAuthorized &&
    (status === 'pronto_para_envio' ||
      status === 'preparando_envio' ||
      status === 'enviado')
  ) {
    return 'Pronto para retirar →'
  }
  if (status === 'enviado' && !opts?.pickup) return 'Acompanhar envio →'
  return null
}

/** Labels operacionais granulares para o painel admin (filas distintas). */
export const orderStatusAdminLabel: Record<string, string> = {
  pendente: 'Pendente',
  aguardando_pagamento: 'Aguardando pagamento',
  pagamento_aprovado: 'Pagamento aprovado (iniciar análise)',
  recebido: 'Aguardando início da análise',
  em_analise: 'Em análise pela loja',
  aguardando_disponibilidade: 'Aguardando disponibilidade',
  aguardando_decisao: 'Aguardando resposta do cliente',
  confirmado: 'Pedido confirmado',
  em_separacao: 'Em separação',
  pronto_para_envio: 'Pronto para envio',
  preparando_envio: 'Preparando envio',
  enviado: 'Enviado',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
}

/** Alias canônico — mesmo mapa que `orderStatusAdminLabel` (O1-A). */
export const orderStatusOperatorLabel = orderStatusAdminLabel

/** Chaves canônicas dos chips de contagem (Dashboard + Pedidos). */
export const ADMIN_ORDER_COUNTER_KEYS = [
  'aguardando_pagamento',
  'recebido',
  'em_analise',
  'aguardando_decisao',
  'aguardando_disponibilidade',
  'confirmado',
  'em_separacao',
  'pronto_para_envio',
  'enviado',
] as const

export type AdminNextStepShipContext = {
  pickup?: boolean
  shippingKind?: 'melhorenvio' | 'own' | 'mock' | 'unknown'
}

/** Próximo passo operacional (admin detalhe). */
export function adminOrderNextStep(
  status: string,
  ship?: AdminNextStepShipContext,
): { title: string; body: string } | null {
  const pickup = Boolean(ship?.pickup)
  const kind = ship?.shippingKind ?? 'unknown'

  switch (status) {
    case 'aguardando_pagamento':
      return {
        title: 'Aguardando pagamento do cliente',
        body: 'Sem ação de confirmação. Cancele (gerente) ou espere aprovação / TTL 48 h.',
      }
    case 'pagamento_aprovado':
    case 'recebido':
      return {
        title: 'Iniciar confirmação',
        body: 'Marque a disponibilidade de cada item e finalize a confirmação.',
      }
    case 'em_analise':
    case 'aguardando_disponibilidade':
      return {
        title: 'Concluir confirmação',
        body: 'Salve a disponibilidade e finalize. Você decide se pede confirmação ao cliente (prazo, obs, etc.) — não é automático.',
      }
    case 'aguardando_decisao':
      return {
        title: 'Aguardando resposta do cliente',
        body: 'Você solicitou confirmação. Autorizado: finalize. Recusado: cancele/renegocie. Ou retire a solicitação.',
      }
    case 'confirmado':
      return {
        title: pickup ? 'Iniciar separação (retirada na loja)' : 'Iniciar separação',
        body: pickup
          ? 'Marque os itens separados (o 1º check avança para Em separação). Volumes não são obrigatórios na retirada.'
          : kind === 'melhorenvio'
            ? 'Marque os itens separados. Depois da separação, confirme volumes/medidas para liberar a etiqueta.'
            : kind === 'own'
              ? 'Marque os itens separados. Depois da separação, confirme o envio (rastreio opcional).'
              : 'Marque os itens separados (o 1º check avança para Em separação).',
      }
    case 'em_separacao':
      return {
        title: pickup ? 'Concluir separação (retirada)' : 'Concluir separação',
        body: pickup
          ? 'Separe todos os itens e conclua. Medidas de volume são opcionais — confirme só se precisar documentar.'
          : kind === 'melhorenvio'
            ? 'Separe todos os itens e conclua. Em seguida confirme volumes (L×A×P/peso) para cotar/comprar a etiqueta Melhor Envio.'
            : kind === 'own'
              ? 'Separe todos os itens e conclua. Em seguida confirme o envio (packing não é obrigatório).'
              : 'Separe todos os itens e então conclua para liberar a expedição.',
      }
    case 'pronto_para_envio':
    case 'preparando_envio':
      if (pickup) {
        return {
          title: 'Autorizar retirada na loja',
          body: 'Pedido separado. Autorize a retirada para o cliente ver no app; depois confirme quando ele buscar. Packing não é obrigatório.',
        }
      }
      if (kind === 'melhorenvio') {
        return {
          title: 'Emitir etiqueta e expedir',
          body: 'Confirme volumes/medidas se ainda faltarem, compre a etiqueta Melhor Envio e registre o envio.',
        }
      }
      if (kind === 'own') {
        return {
          title: 'Confirmar envio (frete próprio)',
          body: 'Confirme o envio com rastreio/link opcional. Depois confirme a entrega ao cliente.',
        }
      }
      return {
        title: 'Expedir pedido',
        body: 'Informe transportadora/rastreio (opcional) e registre o envio.',
      }
    case 'enviado':
      return {
        title: pickup ? 'Confirmar retirada' : 'Confirmar entrega',
        body: pickup
          ? 'Quando o cliente retirar na loja, confirme a entrega.'
          : 'Quando o cliente receber, confirme a entrega.',
      }
    case 'entregue':
    case 'cancelado':
      return null
    default:
      return {
        title: 'Status operacional',
        body: 'Verifique o histórico de eventos abaixo.',
      }
  }
}

export const orderEventLabel: Record<string, string> = {
  order_created: 'Pedido realizado',
  payment_approved: 'Pagamento aprovado',
  payment_failed: 'Pagamento não aprovado',
  order_received: 'Pedido recebido pela FAL',
  confirmation_started: 'Confirmação iniciada',
  availability_checked: 'Disponibilidade conferida',
  availability_issue_detected: 'Pendência de disponibilidade',
  delivery_deadline_updated: 'Prazo atualizado',
  order_confirmed: 'Pedido confirmado pela FAL',
  order_sent_to_separation: 'Enviado para separação',
  separation_started: 'Separação iniciada',
  separation_completed: 'Separação concluída',
  shipment_prepared: 'Expedição preparada',
  order_shipped: 'Pedido enviado',
  order_delivered: 'Pedido entregue',
  pickup_authorized: 'Retirada autorizada',
  // confirm pickup também emite order_delivered — label acima cobre "Retirada feita" no status
  own_delivery_attempt: 'Tentativa de entrega própria',
  packing_updated: 'Packing / volumes atualizados',
  customer_receipt_confirmed: 'Cliente confirmou o recebimento',
  staff_requested_customer_decision: 'Loja solicitou confirmação do cliente',
  staff_withdrew_customer_decision: 'Loja retirou solicitação de confirmação',
  occurrence_opened: 'Ocorrência aberta',
  occurrence_updated: 'Ocorrência atualizada',
  occurrence_assigned: 'Ocorrência atribuída',
  occurrence_started: 'Ocorrência em andamento',
  occurrence_resolved: 'Ocorrência resolvida',
  occurrence_reopened: 'Ocorrência reaberta',
  freight_finance_updated: 'Custo de frete (G8) atualizado',
  order_cancelled: 'Pedido cancelado',
  order_expired_unpaid: 'Expirado sem pagamento',
  order_awaiting_decision: 'Loja pediu sua autorização',
  customer_authorized_changes: 'Alterações autorizadas pelo cliente',
  customer_rejected_changes: 'Alterações recusadas pelo cliente',
  cancellation_requested: 'Solicitação de cancelamento enviada',
  cancellation_approved: 'Cancelamento aprovado pela loja',
  cancellation_rejected: 'Solicitação de cancelamento recusada',
  payment_refunded: 'Estorno do pagamento registrado',
  status_changed: 'Atualização do pedido',
  item_separated: 'Item marcado na separação',
}

/** Visibilidade do evento na UI admin (O0-C — sem inglês cru). */
export function orderEventVisibilityLabel(visibility: string | null | undefined): string {
  const key = String(visibility ?? '')
    .trim()
    .toLowerCase()
  if (key === 'customer') return 'visível ao cliente'
  if (key === 'internal') return 'interno'
  if (!key) return '—'
  return key
}

/**
 * Resultado de `finalize_order_confirmation` (toast / eventos admin).
 * Valores canônicos do SQL — sem snake_case cru na UI.
 */
export function orderConfirmationResultLabel(result: string | null | undefined): string {
  const key = String(result ?? '')
    .trim()
    .toLowerCase()
  if (!key) return '—'
  if (key === 'confirmado') return 'Confirmado'
  if (key === 'confirmado_com_prazo') return 'Confirmado (prazo informado pela loja)'
  if (key === 'nao_atendivel') return 'Não atendível — pedir autorização'
  if (key === 'com_ressalva') return 'Com ressalva (prazo) — pedir autorização'
  if (key === 'autorizado_com_indisponivel') return 'Autorizado com item indisponível'
  if (key === 'autorizado_com_prazo') return 'Autorizado com prazo'
  return result ?? '—'
}
