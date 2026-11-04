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
  { id: 'recebido_pela_fal', label: 'Aguardando confirmação da loja' },
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

/** CTA principal na lista Meus pedidos. */
export function customerOrderListCta(status: string): string | null {
  switch (status) {
    case 'aguardando_pagamento':
      return 'Continuar pagamento →'
    case 'aguardando_decisao':
      return 'Responder loja →'
    default:
      return null
  }
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
  'pronto_para_envio',
  'enviado',
] as const

/** Próximo passo operacional (admin detalhe). */
export function adminOrderNextStep(status: string): { title: string; body: string } | null {
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
        body: 'Salve a disponibilidade nos itens e use Finalizar confirmação. Indisponível/prazo pedem autorização do cliente.',
      }
    case 'aguardando_decisao':
      return {
        title: 'Aguardando autorização do cliente',
        body: 'Sem resposta: aguarde. Autorizado: finalize de novo para confirmar. Recusado: cancele ou renegocie.',
      }
    case 'confirmado':
      return {
        title: 'Iniciar separação',
        body: 'Marque os itens separados (o 1º check avança para Em separação).',
      }
    case 'em_separacao':
      return {
        title: 'Concluir separação',
        body: 'Separe todos os itens e então conclua para liberar a expedição.',
      }
    case 'pronto_para_envio':
    case 'preparando_envio':
      return {
        title: 'Expedir pedido',
        body: 'Informe transportadora/rastreio (opcional) e registre o envio.',
      }
    case 'enviado':
      return {
        title: 'Confirmar entrega',
        body: 'Quando o cliente receber, confirme a entrega.',
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
  order_cancelled: 'Pedido cancelado',
  order_expired_unpaid: 'Expirado sem pagamento',
  order_awaiting_decision: 'Loja pediu sua autorização',
  customer_authorized_changes: 'Você autorizou as alterações',
  customer_rejected_changes: 'Você recusou as alterações',
  status_changed: 'Atualização do pedido',
  item_separated: 'Item marcado na separação',
}
