/**
 * Ocorrências imutáveis via order_events (CP-EVT-01 + Marcha 7).
 * Situação: aberta | em_andamento | resolvida | reaberta.
 * Histórico append-only — nunca some por patch de metadata.
 * F3: stage / return_mode / me_reverse no payload.
 */

import {
  asPostSaleReturnMode,
  asPostSaleStage,
  parseMeReversePayload,
  type MeReversePayload,
  type PostSaleReturnMode,
  type PostSaleStage,
} from '@/lib/postSaleStages'

export type OccurrenceSeverity = 'baixa' | 'media' | 'alta'
export type OccurrencePriority = 'baixa' | 'media' | 'alta' | 'urgente'

/** Status derivado do último evento do occurrence_id. */
export type OccurrenceStatus = 'open' | 'in_progress' | 'resolved' | 'reopened'

export type OccurrenceEventLite = {
  id: string
  eventType: string
  payload: Record<string, unknown>
  visibility: string
  createdAt: string
}

export type OccurrenceCurrent = {
  occurrenceId: string
  status: OccurrenceStatus
  tipo: string | null
  gravidade: OccurrenceSeverity
  prioridade: OccurrencePriority
  acaoNecessaria: string | null
  note: string | null
  solucao: string | null
  motivoEncerramento: string | null
  motivoReabertura: string | null
  responsavelId: string | null
  assigneeId: string | null
  visibility: string
  lastEventType: string
  lastEventAt: string
  eventCount: number
  /** F3 pós-venda */
  stage: PostSaleStage | null
  returnMode: PostSaleReturnMode | null
  serviceOverride: string | null
  meReverse: MeReversePayload | null
}

export const OCCURRENCE_EVENTS = new Set([
  'occurrence_opened',
  'occurrence_updated',
  'occurrence_assigned',
  'occurrence_started',
  'occurrence_resolved',
  'occurrence_reopened',
])

export const OCCURRENCE_STATUS_LABEL: Record<OccurrenceStatus, string> = {
  open: 'Aberta',
  in_progress: 'Em andamento',
  resolved: 'Resolvida',
  reopened: 'Reaberta',
}

function asPriority(v: unknown): OccurrencePriority | null {
  if (v === 'baixa' || v === 'media' || v === 'alta' || v === 'urgente') return v
  return null
}

function asSeverity(v: unknown): OccurrenceSeverity | null {
  if (v === 'baixa' || v === 'media' || v === 'alta') return v
  return null
}

function statusFromLastEvent(eventType: string): OccurrenceStatus {
  switch (eventType) {
    case 'occurrence_resolved':
      return 'resolved'
    case 'occurrence_reopened':
      return 'reopened'
    case 'occurrence_started':
    case 'occurrence_assigned':
      return 'in_progress'
    default:
      return 'open'
  }
}

/** Aberta / em andamento / reaberta → entra na fila Revisão. */
export function isOccurrenceOpenForQueue(o: Pick<OccurrenceCurrent, 'status'>): boolean {
  return o.status === 'open' || o.status === 'in_progress' || o.status === 'reopened'
}

export function deriveOccurrences(events: OccurrenceEventLite[]): OccurrenceCurrent[] {
  const byId = new Map<string, OccurrenceEventLite[]>()
  for (const e of events) {
    if (!OCCURRENCE_EVENTS.has(e.eventType)) continue
    const oid = String(e.payload.occurrence_id ?? '')
    if (!oid) continue
    const list = byId.get(oid) ?? []
    list.push(e)
    byId.set(oid, list)
  }

  const out: OccurrenceCurrent[] = []
  for (const [occurrenceId, list] of byId) {
    const sorted = [...list].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    let tipo: string | null = null
    let gravidade: OccurrenceSeverity = 'media'
    let prioridade: OccurrencePriority = 'media'
    let acaoNecessaria: string | null = null
    let note: string | null = null
    let solucao: string | null = null
    let motivoEncerramento: string | null = null
    let motivoReabertura: string | null = null
    let responsavelId: string | null = null
    let assigneeId: string | null = null
    let visibility = 'internal'
    let stage: PostSaleStage | null = null
    let returnMode: PostSaleReturnMode | null = null
    let serviceOverride: string | null = null
    let meReverse: MeReversePayload | null = null
    for (const e of sorted) {
      const p = e.payload
      if (p.tipo != null && String(p.tipo)) tipo = String(p.tipo)
      const g = asSeverity(p.gravidade)
      if (g) gravidade = g
      const pr = asPriority(p.prioridade ?? p.priority)
      if (pr) prioridade = pr
      if (p.acao_necessaria != null && String(p.acao_necessaria)) {
        acaoNecessaria = String(p.acao_necessaria)
      }
      if (p.note != null) note = String(p.note)
      if (p.solucao != null && String(p.solucao)) solucao = String(p.solucao)
      if (p.motivo_encerramento != null && String(p.motivo_encerramento)) {
        motivoEncerramento = String(p.motivo_encerramento)
      }
      if (p.motivo_reabertura != null && String(p.motivo_reabertura)) {
        motivoReabertura = String(p.motivo_reabertura)
      }
      if (p.responsavel_id != null) responsavelId = String(p.responsavel_id)
      if (p.assignee_id != null) assigneeId = String(p.assignee_id)
      const st = asPostSaleStage(p.stage)
      if (st) stage = st
      const rm = asPostSaleReturnMode(p.return_mode)
      if (rm) returnMode = rm
      if (p.service_override != null && String(p.service_override)) {
        serviceOverride = String(p.service_override)
      }
      const mr = parseMeReversePayload(p.me_reverse)
      if (mr?.tracking_code) meReverse = mr
      visibility = e.visibility
    }
    const last = sorted[sorted.length - 1]!
    if (!stage) {
      if (last.eventType === 'occurrence_resolved') stage = 'resolvido'
      else if (last.eventType === 'occurrence_started' || last.eventType === 'occurrence_reopened') {
        stage = 'em_analise'
      } else if (last.eventType === 'occurrence_opened') stage = 'aberto'
    }
    out.push({
      occurrenceId,
      status: statusFromLastEvent(last.eventType),
      tipo,
      gravidade,
      prioridade,
      acaoNecessaria,
      note,
      solucao,
      motivoEncerramento,
      motivoReabertura,
      responsavelId,
      assigneeId,
      visibility,
      lastEventType: last.eventType,
      lastEventAt: last.createdAt,
      eventCount: sorted.length,
      stage,
      returnMode,
      serviceOverride,
      meReverse,
    })
  }

  return out.sort((a, b) => b.lastEventAt.localeCompare(a.lastEventAt))
}

export type OccurrenceActionKind =
  | 'open'
  | 'update'
  | 'assign'
  | 'start'
  | 'resolve'
  | 'reopen'

export function validateOccurrenceAction(input: {
  action: OccurrenceActionKind
  tipo?: string | null
  acaoNecessaria?: string | null
  solucao?: string | null
  reopenReason?: string | null
  assigneeId?: string | null
}): { ok: boolean; reason?: string } {
  if (input.action === 'open') {
    if (!String(input.tipo ?? '').trim()) return { ok: false, reason: 'tipo obrigatório' }
    if (!String(input.acaoNecessaria ?? '').trim()) {
      return { ok: false, reason: 'ação necessária obrigatória' }
    }
  }
  if (input.action === 'resolve' && !String(input.solucao ?? '').trim()) {
    return { ok: false, reason: 'solução / motivo de encerramento obrigatório' }
  }
  if (input.action === 'reopen' && !String(input.reopenReason ?? '').trim()) {
    return { ok: false, reason: 'motivo de reabertura obrigatório' }
  }
  if (input.action === 'assign' && !String(input.assigneeId ?? '').trim()) {
    return { ok: false, reason: 'assignee obrigatório' }
  }
  return { ok: true }
}
