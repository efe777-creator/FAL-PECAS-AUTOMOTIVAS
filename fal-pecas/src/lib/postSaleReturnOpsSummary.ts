/**
 * Resumo ops: situação da devolução (etiqueta/código) vs ida da venda.
 */
import { deriveOccurrences, type OccurrenceCurrent } from '@/lib/orderOccurrences'
import {
  isPostSaleTipo,
  meReverseCodeValid,
  POST_SALE_RETURN_MODE_LABEL,
  POST_SALE_STAGE_LABEL,
  type MeReversePayload,
  type PostSaleReturnMode,
  type PostSaleStage,
} from '@/lib/postSaleStages'
import {
  evaluateMeReverseEligibility,
  looksSyntheticMeOrderId,
  readMeCartItemId,
  countShipmentVolumes,
} from '@/lib/meReverseEligibility'

export type PostSaleReturnOpsSummary = {
  occurrenceId: string
  stage: PostSaleStage | null
  stageLabel: string
  returnMode: PostSaleReturnMode | null
  returnModeLabel: string | null
  meReverse: MeReversePayload | null
  codeValid: boolean
  trackingCode: string | null
  trackingUrl: string | null
  expiresAt: string | null
  outboundTracking: string | null
  outboundCartItemId: string | null
  outboundSynthetic: boolean
  meEligibleOk: boolean
  liveReady: boolean
  statusLine: string
}

function statusLineFor(o: OccurrenceCurrent, codeValid: boolean): string {
  const stage = o.stage
  if (o.status === 'resolved' || stage === 'resolvido') return 'Devolução encerrada'
  if (stage === 'recusada') return 'Devolução recusada'
  if (stage === 'em_conferencia') return 'Peça em conferência na loja'
  if (stage === 'aguardando_peca') {
    if (o.returnMode === 'me_codigo' && codeValid) return 'Aguardando postagem (código válido)'
    if (o.returnMode === 'wa') return 'Aguardando postagem (orientação WA)'
    if (o.returnMode === 'loja') return 'Aguardando cliente trazer na loja'
    return 'Aguardando peça'
  }
  if (stage === 'autorizada') {
    if (o.returnMode === 'me_codigo' && codeValid) return 'Autorizada · código gerado'
    if (o.returnMode === 'me_codigo') return 'Autorizada · aguardando cliente gerar código'
    if (o.returnMode === 'wa') return 'Autorizada · combinar no WhatsApp'
    if (o.returnMode === 'loja') return 'Autorizada · devolver na loja'
    return 'Devolução autorizada'
  }
  if (stage === 'em_analise') return 'Caso em análise'
  if (stage === 'aberto') return 'Caso aberto — aguarda ops'
  return 'Atendimento pós-venda em andamento'
}

export function pickPrimaryPostSaleOccurrence(
  occurrences: OccurrenceCurrent[],
): OccurrenceCurrent | null {
  const post = occurrences.filter((o) => isPostSaleTipo(o.tipo))
  const open = post.find((o) => o.status !== 'resolved')
  if (open) return open
  return post[0] ?? null
}

export function buildPostSaleReturnOpsSummary(input: {
  events: {
    id: string
    eventType: string
    payload: Record<string, unknown>
    visibility: string
    createdAt: string
  }[]
  orderStatus: string
  provider?: string | null
  shipmentMetadata?: Record<string, unknown> | null
  outboundTracking?: string | null
}): PostSaleReturnOpsSummary | null {
  const list = deriveOccurrences(input.events)
  const o = pickPrimaryPostSaleOccurrence(list)
  if (!o) return null

  const codeValid = meReverseCodeValid(o.meReverse)
  const cartId = readMeCartItemId(input.shipmentMetadata ?? null)
  const elig = evaluateMeReverseEligibility({
    orderStatus: input.orderStatus,
    provider: input.provider,
    volumeCount: countShipmentVolumes(input.shipmentMetadata ?? null),
    meOrderId: cartId,
  })

  return {
    occurrenceId: o.occurrenceId,
    stage: o.stage,
    stageLabel: o.stage ? POST_SALE_STAGE_LABEL[o.stage] : '—',
    returnMode: o.returnMode,
    returnModeLabel: o.returnMode ? POST_SALE_RETURN_MODE_LABEL[o.returnMode] : null,
    meReverse: o.meReverse,
    codeValid,
    trackingCode: o.meReverse?.tracking_code ? String(o.meReverse.tracking_code) : null,
    trackingUrl: o.meReverse?.tracking_url ? String(o.meReverse.tracking_url) : null,
    expiresAt: o.meReverse?.expires_at ? String(o.meReverse.expires_at) : null,
    outboundTracking: input.outboundTracking ? String(input.outboundTracking) : null,
    outboundCartItemId: cartId,
    outboundSynthetic: looksSyntheticMeOrderId(cartId),
    meEligibleOk: elig.ok,
    liveReady: elig.liveReady,
    statusLine: statusLineFor(o, codeValid),
  }
}
