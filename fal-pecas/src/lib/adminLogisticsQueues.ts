/**
 * Filas da Expedição logística (V2.2 Marcha 1).
 * Não inventa status EN — filtra orders.status + shipments.provider + packing + label_state + payments.
 * Mock nunca entra em etiquetas-me nem entregas-proprias.
 */

import { parseOrderPacking, type OrderPacking } from '@/lib/orderPacking'

/** Filas operacionais sob Expedição / hub (Opção A híbrida). */
export type AdminLogisticsQueueId =
  | 'volumes'
  | 'etiquetas-me'
  | 'entregas-proprias'
  | 'transito'
  | 'entregues'
  | 'revisao'

export type AdminLogisticsNextAction =
  | 'aguardar_separacao'
  | 'aguardar_conferencia'
  | 'conferencia_divergencia'
  | 'aguardar_embalagem'
  | 'embalagem_incompleta'
  | 'embalagem_invalida'
  | 'revisao_aberta'
  | 'emitir_etiqueta'
  | 'organizar_entrega_propria'
  | 'aguardar_postagem'
  | 'em_transito'
  | 'entregue'
  | 'mock_sandbox'
  | 'retirada'
  | 'desconhecida'

export type AdminLogisticsQueue = {
  id: AdminLogisticsQueueId
  title: string
  description: string
  /** Path canônico (expedição com ?fila= ou visão). */
  path: string
  primaryCta: string
}

export const ADMIN_LOGISTICS_QUEUES: readonly AdminLogisticsQueue[] = [
  {
    id: 'volumes',
    title: 'Preparar volumes',
    description: 'Separação concluída — falta embalar ou completar medidas/peso.',
    path: '/admin/pedidos/expedicao?fila=volumes',
    primaryCta: 'Registrar volumes e peso',
  },
  {
    id: 'etiquetas-me',
    title: 'Emitir etiquetas (Melhor Envio)',
    description: 'Embalados, pagos, modalidade Melhor Envio — aguardando compra da etiqueta.',
    path: '/admin/pedidos/expedicao?fila=etiquetas-me',
    primaryCta: 'Comprar / imprimir etiqueta',
  },
  {
    id: 'entregas-proprias',
    title: 'Entregas próprias FAL',
    description: 'Embalados, pagos, provider own — organizar motorista e saída.',
    path: '/admin/pedidos/expedicao?fila=entregas-proprias',
    primaryCta: 'Organizar entrega própria',
  },
  {
    id: 'revisao',
    title: 'Revisão e ocorrências',
    description: 'Exceções ME/Own e revisões manuais — fora das filas de despacho.',
    path: '/admin/pedidos/visao/revisao-logistica',
    primaryCta: 'Resolver ocorrência',
  },
  {
    id: 'transito',
    title: 'Em trânsito',
    description: 'Postagem ou saída confirmada (status enviado).',
    path: '/admin/pedidos/expedicao?fila=transito',
    primaryCta: 'Acompanhar entrega',
  },
  {
    id: 'entregues',
    title: 'Entregues',
    description: 'Entrega confirmada ao cliente.',
    path: '/admin/pedidos/expedicao?fila=entregues',
    primaryCta: 'Consultar histórico',
  },
] as const

export const ADMIN_LOGISTICS_NEXT_ACTION_LABEL: Record<AdminLogisticsNextAction, string> = {
  aguardar_separacao: 'Aguardando separação',
  aguardar_conferencia: 'Aguardando conferência',
  conferencia_divergencia: 'Conferência com divergência',
  aguardar_embalagem: 'Aguardando embalagem',
  embalagem_incompleta: 'Embalagem incompleta',
  embalagem_invalida: 'Embalagem inválida',
  revisao_aberta: 'Revisão aberta',
  emitir_etiqueta: 'Emitir etiqueta Melhor Envio',
  organizar_entrega_propria: 'Organizar entrega própria',
  aguardar_postagem: 'Aguardando postagem/coleta',
  em_transito: 'Em trânsito',
  entregue: 'Entregue',
  mock_sandbox: 'Mock/sandbox (sem fila real)',
  retirada: 'Retirada na loja',
  desconhecida: 'Verificar pedido',
}

/** Pagamento canônico — alinhado a payments_status_check. */
export type PaymentCanonicalStatus =
  | 'created'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'failed'
  | 'cancelled'
  | 'expired'
  | 'refunded'
  | string

export function isPaymentCanonicallyApproved(status: string | null | undefined): boolean {
  return status === 'approved'
}

export function isPaymentBlockingLogistics(status: string | null | undefined): boolean {
  if (!status) return true
  return (
    status === 'created' ||
    status === 'pending' ||
    status === 'rejected' ||
    status === 'failed' ||
    status === 'cancelled' ||
    status === 'expired' ||
    status === 'refunded'
  )
}

export type LogisticsShipmentLite = {
  provider: string | null
  metadata: Record<string, unknown> | null
}

export type LogisticsOrderLite = {
  status: string
  paymentStatus?: string | null
  shipment?: LogisticsShipmentLite | null
  /** Revisão/ocorrência aberta (quando conhecido). */
  hasOpenReview?: boolean
}

/** Provider persistido pelo place_order: melhorenvio | own | mock. */
export function normalizeShipProvider(provider: string | null | undefined): 'melhorenvio' | 'own' | 'mock' | 'unknown' {
  const p = (provider ?? '').toLowerCase().trim()
  if (p === 'melhorenvio' || p.includes('melhorenvio')) return 'melhorenvio'
  if (p === 'own') return 'own'
  if (p.includes('mock') || p === 'pickup' || p.startsWith('mock')) return 'mock'
  return 'unknown'
}

/**
 * Packing estruturalmente completo (Marcha 1).
 * Alocação formal produtos↔volumes = Marcha 3 — aqui só volumes com dims/peso válidos.
 */
export function isOrderPackingStructurallyComplete(packing: OrderPacking): boolean {
  if (!packing.volumes.length) return false
  return packing.volumes.every(
    (v) =>
      Boolean(v.id) &&
      Number(v.lengthCm) > 0 &&
      Number(v.widthCm) > 0 &&
      Number(v.heightCm) > 0 &&
      Number(v.weightKg) > 0,
  )
}

export function packingFromShipmentMeta(
  metadata: Record<string, unknown> | null | undefined,
): boolean {
  return isOrderPackingStructurallyComplete(parseOrderPacking(metadata ?? null))
}

export function meLabelStateFromMeta(metadata: Record<string, unknown> | null | undefined): string {
  const me = metadata?.me
  if (!me || typeof me !== 'object') return 'none'
  const s = (me as { label_state?: unknown }).label_state
  return s != null ? String(s) : 'none'
}

export function isMeLabelPurchasedOrBeyond(labelState: string): boolean {
  return labelState === 'purchased' || labelState === 'generated' || labelState === 'printed'
}

const EXPEDICAO_READY = new Set(['pronto_para_envio', 'preparando_envio'])

export function getAdminLogisticsQueue(id: string): AdminLogisticsQueue | undefined {
  return ADMIN_LOGISTICS_QUEUES.find((q) => q.id === id)
}

/** Ordem elegível a filas reais ME/Own (não mock, não cancelado). */
export function orderMatchesLogisticsQueue(
  order: LogisticsOrderLite,
  queueId: AdminLogisticsQueueId,
): boolean {
  if (order.status === 'cancelado') return false
  if (queueId === 'revisao') return Boolean(order.hasOpenReview)

  if (queueId === 'transito') return order.status === 'enviado'
  if (queueId === 'entregues') return order.status === 'entregue'

  const provider = normalizeShipProvider(order.shipment?.provider)
  const packingOk = packingFromShipmentMeta(order.shipment?.metadata ?? null)
  const labelState = meLabelStateFromMeta(order.shipment?.metadata ?? null)
  const paid = isPaymentCanonicallyApproved(order.paymentStatus)

  if (queueId === 'volumes') {
    if (!EXPEDICAO_READY.has(order.status)) return false
    if (provider !== 'melhorenvio' && provider !== 'own') return false
    if (order.hasOpenReview) return false
    return !packingOk
  }

  if (queueId === 'etiquetas-me') {
    if (!EXPEDICAO_READY.has(order.status)) return false
    if (provider !== 'melhorenvio') return false
    if (order.hasOpenReview) return false
    if (!packingOk) return false
    if (!paid) return false
    if (isMeLabelPurchasedOrBeyond(labelState)) return false
    return true
  }

  if (queueId === 'entregas-proprias') {
    if (!EXPEDICAO_READY.has(order.status)) return false
    if (provider !== 'own') return false
    if (order.hasOpenReview) return false
    if (!packingOk) return false
    if (!paid) return false
    return true
  }

  return false
}

export function logisticsNextAction(order: LogisticsOrderLite): AdminLogisticsNextAction {
  if (order.hasOpenReview) return 'revisao_aberta'
  if (order.status === 'entregue') return 'entregue'
  if (order.status === 'enviado') return 'em_transito'
  if (order.status === 'confirmado') return 'aguardar_separacao'
  if (order.status === 'em_separacao') return 'aguardar_conferencia'

  const provider = normalizeShipProvider(order.shipment?.provider)
  if (provider === 'mock') return 'mock_sandbox'

  const optionId = String(order.shipment?.metadata?.option_id ?? '')
  if (optionId.includes('pickup') || optionId.startsWith('mock:pickup')) return 'retirada'

  if (!EXPEDICAO_READY.has(order.status)) return 'desconhecida'

  const packing = parseOrderPacking(order.shipment?.metadata ?? null)
  const packingOk = packingFromShipmentMeta(order.shipment?.metadata ?? null)
  if (!packing.volumes.length) return 'aguardar_embalagem'
  if (!packingOk) {
    const invalid = packing.volumes.some(
      (v) =>
        Number(v.lengthCm) <= 0 ||
        Number(v.widthCm) <= 0 ||
        Number(v.heightCm) <= 0 ||
        Number(v.weightKg) <= 0,
    )
    return invalid ? 'embalagem_invalida' : 'embalagem_incompleta'
  }

  const labelState = meLabelStateFromMeta(order.shipment?.metadata ?? null)
  if (provider === 'melhorenvio') {
    if (isMeLabelPurchasedOrBeyond(labelState)) return 'aguardar_postagem'
    if (!isPaymentCanonicallyApproved(order.paymentStatus)) return 'desconhecida'
    return 'emitir_etiqueta'
  }
  if (provider === 'own') {
    if (!isPaymentCanonicallyApproved(order.paymentStatus)) return 'desconhecida'
    return 'organizar_entrega_propria'
  }
  return 'desconhecida'
}

export type LogisticsQueueCounts = Record<AdminLogisticsQueueId, number>

export function emptyLogisticsQueueCounts(): LogisticsQueueCounts {
  return {
    volumes: 0,
    'etiquetas-me': 0,
    'entregas-proprias': 0,
    revisao: 0,
    transito: 0,
    entregues: 0,
  }
}
