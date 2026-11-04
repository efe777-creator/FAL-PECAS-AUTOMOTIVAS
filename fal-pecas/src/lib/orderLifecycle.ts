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
  { id: 'aguardando_pagamento', label: 'Aguardando pagamento' },
  { id: 'pagamento_aprovado', label: 'Pagamento aprovado' },
  { id: 'recebido_pela_fal', label: 'Pedido recebido pela FAL' },
  { id: 'em_confirmacao', label: 'Pedido em confirmação' },
  { id: 'separacao', label: 'Separação' },
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
    case 'confirmado':
      return status === 'recebido' ? 'recebido_pela_fal' : 'em_confirmacao'
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

export function projectCustomerTimeline(status: string): CustomerTimelineStep[] {
  if (status === 'cancelado') {
    return [
      { id: 'pedido_realizado', label: 'Pedido realizado', state: 'done' },
      { id: 'cancelado', label: 'Pedido cancelado', state: 'current' },
    ]
  }

  const current = mapStatusToCustomerStep(status)
  // recebido: step recebido é current; demais confirmação ainda todo
  let activeIndex = HAPPY_PATH.findIndex((s) => s.id === current)
  if (status === 'recebido') {
    activeIndex = HAPPY_PATH.findIndex((s) => s.id === 'recebido_pela_fal')
  } else if (status === 'confirmado') {
    // confirmação concluída; próximo é separação (ainda todo)
    activeIndex = HAPPY_PATH.findIndex((s) => s.id === 'em_confirmacao')
  } else if (
    status === 'em_analise' ||
    status === 'aguardando_disponibilidade' ||
    status === 'aguardando_decisao'
  ) {
    activeIndex = HAPPY_PATH.findIndex((s) => s.id === 'em_confirmacao')
  }

  if (activeIndex < 0) activeIndex = 0

  return HAPPY_PATH.map((s, i) => ({
    id: s.id,
    label: s.label,
    state: i < activeIndex ? 'done' : i === activeIndex ? 'current' : 'todo',
  }))
}

/** Labels simplificados para a área do cliente (conta / timeline). */
export const orderStatusLabel: Record<string, string> = {
  pendente: 'Pendente',
  aguardando_pagamento: 'Aguardando pagamento',
  pagamento_aprovado: 'Pagamento aprovado',
  recebido: 'Recebido pela FAL',
  em_analise: 'Em confirmação',
  aguardando_disponibilidade: 'Em confirmação',
  aguardando_decisao: 'Em confirmação',
  confirmado: 'Confirmado',
  em_separacao: 'Em separação',
  pronto_para_envio: 'Separação',
  preparando_envio: 'Separação',
  enviado: 'Enviado',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
}

/** Labels operacionais granulares para o painel admin (filas distintas). */
export const orderStatusAdminLabel: Record<string, string> = {
  pendente: 'Pendente',
  aguardando_pagamento: 'Aguardando pagamento',
  pagamento_aprovado: 'Pagamento aprovado',
  recebido: 'Recebido pela FAL',
  em_analise: 'Em análise',
  aguardando_disponibilidade: 'Aguardando disponibilidade',
  aguardando_decisao: 'Aguardando decisão',
  confirmado: 'Confirmado',
  em_separacao: 'Em separação',
  pronto_para_envio: 'Pronto para envio',
  preparando_envio: 'Preparando envio',
  enviado: 'Enviado',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
}

/** Chaves canônicas dos chips de contagem (Dashboard + Pedidos). */
export const ADMIN_ORDER_COUNTER_KEYS = [
  'aguardando_pagamento',
  'recebido',
  'em_analise',
  'aguardando_decisao',
  'aguardando_disponibilidade',
  'confirmado',
  'em_separacao',
] as const

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
  order_cancelled: 'Pedido cancelado',
  status_changed: 'Atualização do pedido',
}
