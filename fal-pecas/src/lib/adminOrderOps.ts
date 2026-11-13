/**
 * Apresentação operacional do fluxo de pedidos (admin).
 * Não inventa status — só agrupa e rotula os existentes.
 */

import { adminOrderNextStep, orderStatusOperatorLabel } from '@/lib/orderLifecycle'

export type AdminOrderGroupId = 'pagamento' | 'analise' | 'preparacao' | 'expedicao' | 'finalizados'

export type AdminActorKind = 'team' | 'customer' | 'wait_payment' | 'done'

export type AdminOrderGroup = {
  id: AdminOrderGroupId
  title: string
  description: string
  statuses: readonly string[]
}

export { orderStatusOperatorLabel }

export const ADMIN_ORDER_GROUPS: readonly AdminOrderGroup[] = [
  {
    id: 'pagamento',
    title: 'Pagamento',
    description: 'Cliente ainda não pagou. A equipe só acompanha; aprovação vem do gateway.',
    statuses: ['aguardando_pagamento'],
  },
  {
    id: 'analise',
    title: 'Análise da loja',
    description:
      'Pagamento ok. Conferir itens, disponibilidade e, se preciso, aguardar autorização do cliente. Após o Mercado Pago o pedido já entra em análise.',
    statuses: [
      'pagamento_aprovado',
      'recebido',
      'em_analise',
      'aguardando_decisao',
      'aguardando_disponibilidade',
    ],
  },
  {
    id: 'preparacao',
    title: 'Preparação',
    description: 'Pedido confirmado pela loja — separar produtos.',
    statuses: ['confirmado', 'em_separacao'],
  },
  {
    id: 'expedicao',
    title: 'Expedição',
    description: 'Separação concluída, postagem ou já enviado.',
    statuses: ['pronto_para_envio', 'preparando_envio', 'enviado'],
  },
  {
    id: 'finalizados',
    title: 'Finalizados',
    description: 'Entregues ou cancelados/expirados (consulta).',
    statuses: ['entregue', 'cancelado'],
  },
] as const

const STATUS_TO_GROUP: Record<string, AdminOrderGroupId> = (() => {
  const m: Record<string, AdminOrderGroupId> = {}
  for (const g of ADMIN_ORDER_GROUPS) {
    for (const s of g.statuses) m[s] = g.id
  }
  return m
})()

export function adminOrderGroupId(status: string): AdminOrderGroupId | null {
  return STATUS_TO_GROUP[status] ?? null
}

export function sumGroupCount(
  counts: Record<string, number>,
  group: AdminOrderGroup,
): number {
  return group.statuses.reduce((acc, s) => acc + (counts[s] ?? 0), 0)
}

/** Substatus a exibir no bloco (oculta legado se count 0). */
export function visibleStatusesInGroup(
  group: AdminOrderGroup,
  counts: Record<string, number>,
): string[] {
  return group.statuses.filter((s) => {
    if (s === 'aguardando_disponibilidade' || s === 'preparando_envio') {
      return (counts[s] ?? 0) > 0
    }
    if (s === 'pagamento_aprovado' || s === 'recebido') {
      // Mostrar sempre com copy; se 0, ainda educa o operador
      return true
    }
    return true
  })
}

export type CustomerDecisionLite =
  | 'pending'
  | 'authorized'
  | 'rejected'
  | 'continue_available'
  | 'wait_arrival'
  | 'cancel_order'
  | null
  | undefined

/**
 * Quem precisa agir agora.
 * `customer_decision` só importa em aguardando_decisao.
 */
export function adminActorKind(
  status: string,
  customerDecision?: CustomerDecisionLite,
): AdminActorKind {
  switch (status) {
    case 'aguardando_pagamento':
      return 'wait_payment'
    case 'aguardando_decisao':
      if (
        customerDecision === 'authorized' ||
        customerDecision === 'continue_available'
      )
        return 'team'
      if (
        customerDecision === 'rejected' ||
        customerDecision === 'cancel_order' ||
        customerDecision === 'wait_arrival'
      )
        return 'team'
      return 'customer'
    case 'entregue':
    case 'cancelado':
      return 'done'
    case 'enviado':
      return 'team'
    case 'pagamento_aprovado':
    case 'recebido':
    case 'em_analise':
    case 'aguardando_disponibilidade':
    case 'confirmado':
    case 'em_separacao':
    case 'pronto_para_envio':
    case 'preparando_envio':
      return 'team'
    default:
      return 'team'
  }
}

export function adminActorBadgeLabel(kind: AdminActorKind): string {
  switch (kind) {
    case 'team':
      return 'Ação da equipe'
    case 'customer':
      return 'Ação do cliente'
    case 'wait_payment':
      return 'Aguardando pagamento'
    case 'done':
      return 'Concluído'
  }
}

/** Texto curto para lista / fila. */
export function adminNextActionLabel(
  status: string,
  customerDecision?: CustomerDecisionLite,
): string {
  if (status === 'aguardando_decisao') {
    if (
      customerDecision === 'authorized' ||
      customerDecision === 'continue_available'
    )
      return 'Cliente aprovou — finalizar e enviar à separação'
    if (customerDecision === 'rejected' || customerDecision === 'cancel_order')
      return 'Cliente pediu cancelamento — analisar'
    if (customerDecision === 'wait_arrival')
      return 'Cliente pediu espera — retomar quando houver estoque'
    return 'Aguardando autorização do cliente'
  }
  const step = adminOrderNextStep(status)
  return step?.title ?? 'Ver pedido'
}

/**
 * Pedidos que entram na fila "precisam de atenção" do Dashboard.
 * Equipe: análise, prep, expedição (exceto enviado só-acompanhar? plan includes enviado as team for deliver).
 * Cliente: aguardando_decisao pending — entra com badge customer, não como "ação equipe" no highlight principal.
 */
export function isAttentionOrder(
  status: string,
  customerDecision?: CustomerDecisionLite,
): boolean {
  const kind = adminActorKind(status, customerDecision)
  if (kind === 'done' || kind === 'wait_payment') return false
  if (kind === 'customer') return true
  // team attention statuses
  return [
    'pagamento_aprovado',
    'recebido',
    'em_analise',
    'aguardando_disponibilidade',
    'aguardando_decisao',
    'confirmado',
    'em_separacao',
    'pronto_para_envio',
  ].includes(status)
}

/** Prioridade menor = mais urgente na fila. */
export function attentionSortKey(
  status: string,
  customerDecision?: CustomerDecisionLite,
): number {
  if (status === 'pronto_para_envio') return 10
  if (status === 'pagamento_aprovado' || status === 'recebido') return 20
  if (status === 'em_analise' || status === 'aguardando_disponibilidade') return 30
  if (
    status === 'aguardando_decisao' &&
    (customerDecision === 'authorized' || customerDecision === 'continue_available')
  )
    return 25
  if (
    status === 'aguardando_decisao' &&
    (customerDecision === 'rejected' || customerDecision === 'cancel_order')
  )
    return 15
  if (status === 'aguardando_decisao') return 40
  if (status === 'confirmado') return 50
  if (status === 'em_separacao') return 55
  return 90
}

/** Timeline operacional admin — steps condicionais só se aplicáveis. */
export type AdminTimelineStep = {
  id: string
  label: string
  state: 'done' | 'current' | 'todo' | 'skipped'
}

export function projectAdminOrderTimeline(
  status: string,
  opts?: {
    hadDecisionStep?: boolean
    customerDecision?: CustomerDecisionLite
    /** Retirada na loja: labels e passo atual adaptados. */
    pickup?: boolean
    pickupAuthorized?: boolean
  },
): AdminTimelineStep[] {
  if (status === 'cancelado') {
    return [
      { id: 'pedido', label: 'Pedido pendente', state: 'done' },
      { id: 'cancelado', label: 'Cancelado', state: 'current' },
    ]
  }

  const pickup = Boolean(opts?.pickup)
  const pickupAuthorized = Boolean(opts?.pickupAuthorized)
  const hadDecision =
    opts?.hadDecisionStep === true ||
    status === 'aguardando_decisao' ||
    opts?.customerDecision != null

  type Node = { id: string; label: string; match: (s: string) => boolean }
  const nodes: Node[] = [
    {
      id: 'pendente',
      label: 'Pedido pendente',
      match: (s) => s === 'aguardando_pagamento',
    },
    {
      id: 'pago',
      label: 'Pagamento aprovado',
      match: (s) =>
        ['pagamento_aprovado', 'recebido', 'em_analise', 'aguardando_disponibilidade'].includes(s) ||
        [
          'aguardando_decisao',
          'confirmado',
          'em_separacao',
          'pronto_para_envio',
          'preparando_envio',
          'enviado',
          'entregue',
        ].includes(s),
    },
    {
      id: 'analise',
      label: 'FAL analisando pedido',
      match: (s) =>
        ['recebido', 'em_analise', 'aguardando_disponibilidade'].includes(s) ||
        [
          'aguardando_decisao',
          'confirmado',
          'em_separacao',
          'pronto_para_envio',
          'preparando_envio',
          'enviado',
          'entregue',
        ].includes(s),
    },
  ]

  if (hadDecision) {
    nodes.push({
      id: 'decisao',
      label: 'Decisão do cliente',
      match: (s) =>
        s === 'aguardando_decisao' ||
        [
          'confirmado',
          'em_separacao',
          'pronto_para_envio',
          'preparando_envio',
          'enviado',
          'entregue',
        ].includes(s),
    })
  }

  nodes.push(
    {
      id: 'confirmado',
      label: 'Confirmado / separação',
      match: (s) =>
        ['confirmado', 'em_separacao', 'pronto_para_envio', 'preparando_envio'].includes(s) ||
        ['enviado', 'entregue'].includes(s),
    },
    {
      id: 'enviado',
      label: pickup ? 'Pronto para retirar' : 'Enviado',
      match: (s) =>
        s === 'enviado' ||
        s === 'entregue' ||
        (pickup &&
          pickupAuthorized &&
          (s === 'pronto_para_envio' || s === 'preparando_envio')),
    },
    {
      id: 'entregue',
      label: pickup ? 'Retirada feita' : 'Entrega concluída',
      match: (s) => s === 'entregue',
    },
  )

  // Determinar índice current pelo status
  let currentId = 'pendente'
  if (status === 'aguardando_pagamento') currentId = 'pendente'
  else if (status === 'pagamento_aprovado') currentId = 'pago'
  else if (['recebido', 'em_analise', 'aguardando_disponibilidade'].includes(status))
    currentId = 'analise'
  else if (status === 'aguardando_decisao') currentId = 'decisao'
  else if (status === 'entregue') currentId = 'entregue'
  else if (
    pickup &&
    (status === 'enviado' ||
      ((status === 'pronto_para_envio' || status === 'preparando_envio') && pickupAuthorized))
  ) {
    // Autorizado / liberado: aguarda cliente — ainda não é "Retirada feita"
    currentId = 'enviado'
  } else if (status === 'enviado') currentId = 'enviado'
  else if (['confirmado', 'em_separacao', 'pronto_para_envio', 'preparando_envio'].includes(status))
    currentId = 'confirmado'

  const currentIndex = nodes.findIndex((n) => n.id === currentId)
  const idx = currentIndex < 0 ? 0 : currentIndex

  return nodes.map((n, i) => {
    let state: AdminTimelineStep['state']
    if (i < idx) state = 'done'
    else if (i === idx) state = 'current'
    else state = 'todo'
    // Pagamento aprovado já ocorreu se estamos além de pendente
    if (n.id === 'pago' && status !== 'aguardando_pagamento' && i < idx) state = 'done'
    return { id: n.id, label: n.label, state }
  })
}

export function filterStatusByGroup(
  groupId: AdminOrderGroupId | '',
  statusFilter: string,
): string | null {
  if (statusFilter) return statusFilter
  if (!groupId) return null
  // Listagem por grupo: null = todos; caller filtra client-side por grupo
  return null
}

export function orderMatchesGroup(status: string, groupId: AdminOrderGroupId | ''): boolean {
  if (!groupId) return true
  return adminOrderGroupId(status) === groupId
}

/** Quatro áreas de trabalho da Central de Pedidos (visão operacional). */
export type AdminOrderAreaId =
  | 'aguardando-pagamento'
  | 'analise'
  | 'separacao'
  | 'expedicao'

export type AdminOrderArea = {
  id: AdminOrderAreaId
  title: string
  description: string
  path: string
  statuses: readonly string[]
  primaryCta: string
}

export const ADMIN_ORDER_AREAS: readonly AdminOrderArea[] = [
  {
    id: 'aguardando-pagamento',
    title: 'Aguardando pagamento',
    description: 'Pagamento ainda não aprovado pelo gateway. Equipe só acompanha a cobrança.',
    path: '/admin/pedidos/aguardando-pagamento',
    statuses: ['aguardando_pagamento'],
    primaryCta: 'Abrir cobrança',
  },
  {
    id: 'analise',
    title: 'Análise da loja',
    description: 'Pagamento ok. Conferir itens e confirmar o pedido para separação.',
    path: '/admin/pedidos/analise',
    statuses: [
      'pagamento_aprovado',
      'recebido',
      'em_analise',
      'aguardando_decisao',
      'aguardando_disponibilidade',
    ],
    primaryCta: 'Confirmar pedido e enviar para separação',
  },
  {
    id: 'separacao',
    title: 'Em separação',
    description: 'Separar produtos, conferir quantidades e preparar a embalagem.',
    path: '/admin/pedidos/separacao',
    statuses: ['confirmado', 'em_separacao'],
    primaryCta: 'Concluir separação e enviar para expedição',
  },
  {
    id: 'expedicao',
    title: 'Expedição e entrega',
    description:
      'Etiqueta Melhor Envio, postagem à transportadora e entrega ao cliente — etapas distintas.',
    path: '/admin/pedidos/expedicao',
    statuses: ['pronto_para_envio', 'preparando_envio', 'enviado', 'entregue'],
    primaryCta: 'Preparar envio / postagem',
  },
] as const

const STATUS_TO_AREA: Record<string, AdminOrderAreaId> = (() => {
  const m: Record<string, AdminOrderAreaId> = {}
  for (const a of ADMIN_ORDER_AREAS) {
    for (const s of a.statuses) m[s] = a.id
  }
  return m
})()

export function adminOrderAreaId(status: string): AdminOrderAreaId | null {
  return STATUS_TO_AREA[status] ?? null
}

export function sumAreaCount(
  counts: Record<string, number>,
  area: AdminOrderArea,
): number {
  return area.statuses.reduce((acc, s) => acc + (counts[s] ?? 0), 0)
}

export function orderMatchesArea(status: string, areaId: AdminOrderAreaId | ''): boolean {
  if (!areaId) return true
  return adminOrderAreaId(status) === areaId
}

/** Atalhos = visões filtradas, não status artificiais. */
export type AdminOrderViewId =
  | 'todos'
  | 'pendentes'
  | 'decisao-cliente'
  | 'solicitacoes-cancelamento'
  | 'cancelados'
  | 'problemas'
  | 'historico'
  | 'revisao-logistica'

export type AdminOrderView = {
  id: AdminOrderViewId
  title: string
  description: string
  path: string
  /** null = lista avançada sem filtro de status prévio */
  statuses: readonly string[] | null
  placeholder?: boolean
}

export const ADMIN_ORDER_VIEWS: readonly AdminOrderView[] = [
  {
    id: 'todos',
    title: 'Todos os pedidos',
    description: 'Lista avançada com filtro fino por status.',
    path: '/admin/pedidos/lista',
    statuses: null,
  },
  {
    id: 'pendentes',
    title: 'Pedidos pendentes',
    description: 'Pós-pagamento ainda sem confirmação da loja (mesma fila da Análise).',
    path: '/admin/pedidos/visao/pendentes',
    statuses: [
      'pagamento_aprovado',
      'recebido',
      'em_analise',
      'aguardando_decisao',
      'aguardando_disponibilidade',
    ],
  },
  {
    id: 'decisao-cliente',
    title: 'Aguardando decisão do cliente',
    description: 'Pedidos em aguardando_decisao.',
    path: '/admin/pedidos/visao/decisao-cliente',
    statuses: ['aguardando_decisao'],
  },
  {
    id: 'solicitacoes-cancelamento',
    title: 'Solicitações de cancelamento',
    description:
      'Cancelamento pós-pago pendente de análise. Estorno = manual no MP após aprovar.',
    path: '/admin/pedidos/visao/solicitacoes-cancelamento',
    statuses: null,
  },
  {
    id: 'cancelados',
    title: 'Pedidos cancelados',
    description: 'Consulta de cancelados/expirados.',
    path: '/admin/pedidos/visao/cancelados',
    statuses: ['cancelado'],
  },
  {
    id: 'problemas',
    title: 'Pedidos com problemas',
    description: 'Decisão rejeitada pelo cliente ou cobrança falha/rejeitada.',
    path: '/admin/pedidos/visao/problemas',
    statuses: null,
  },
  {
    id: 'historico',
    title: 'Histórico de pedidos',
    description: 'Entregues e cancelados (consulta).',
    path: '/admin/pedidos/visao/historico',
    statuses: ['entregue', 'cancelado'],
  },
  {
    id: 'revisao-logistica',
    title: 'Revisão e ocorrências',
    description:
      'Revisões manuais own e ocorrências abertas — fora das filas de etiqueta/entrega própria.',
    path: '/admin/pedidos/visao/revisao-logistica',
    statuses: null,
  },
] as const

export function getAdminOrderView(id: string): AdminOrderView | undefined {
  return ADMIN_ORDER_VIEWS.find((v) => v.id === id)
}

export function getAdminOrderArea(id: string): AdminOrderArea | undefined {
  return ADMIN_ORDER_AREAS.find((a) => a.id === id)
}

/** Filtro client-side para visão "problemas". */
export function orderMatchesProblemsView(input: {
  status: string
  customerDecision?: CustomerDecisionLite
  paymentStatus?: string | null
}): boolean {
  if (input.status === 'aguardando_decisao' && input.customerDecision === 'rejected') return true
  if (
    input.status === 'aguardando_pagamento' &&
    (input.paymentStatus === 'failed' || input.paymentStatus === 'rejected')
  ) {
    return true
  }
  return false
}
