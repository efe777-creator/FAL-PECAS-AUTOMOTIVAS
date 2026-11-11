/** Ocorrências imutáveis via order_events (CP-EVT-01). Estado = último evento do occurrence_id. */

export type OccurrenceSeverity = 'baixa' | 'media' | 'alta'

export type OccurrenceEventLite = {
  id: string
  eventType: string
  payload: Record<string, unknown>
  visibility: string
  createdAt: string
}

export type OccurrenceCurrent = {
  occurrenceId: string
  status: 'open' | 'resolved'
  tipo: string | null
  gravidade: OccurrenceSeverity
  note: string | null
  solucao: string | null
  responsavelId: string | null
  visibility: string
  lastEventType: string
  lastEventAt: string
  eventCount: number
}

const OCC_EVENTS = new Set([
  'occurrence_opened',
  'occurrence_updated',
  'occurrence_resolved',
])

export function deriveOccurrences(events: OccurrenceEventLite[]): OccurrenceCurrent[] {
  const byId = new Map<string, OccurrenceEventLite[]>()
  for (const e of events) {
    if (!OCC_EVENTS.has(e.eventType)) continue
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
    let note: string | null = null
    let solucao: string | null = null
    let responsavelId: string | null = null
    let visibility = 'internal'
    for (const e of sorted) {
      const p = e.payload
      if (p.tipo != null && String(p.tipo)) tipo = String(p.tipo)
      if (p.gravidade === 'baixa' || p.gravidade === 'media' || p.gravidade === 'alta') {
        gravidade = p.gravidade
      }
      if (p.note != null) note = String(p.note)
      if (p.solucao != null && String(p.solucao)) solucao = String(p.solucao)
      if (p.responsavel_id != null) responsavelId = String(p.responsavel_id)
      visibility = e.visibility
    }
    const last = sorted[sorted.length - 1]!
    out.push({
      occurrenceId,
      status: last.eventType === 'occurrence_resolved' ? 'resolved' : 'open',
      tipo,
      gravidade,
      note,
      solucao,
      responsavelId,
      visibility,
      lastEventType: last.eventType,
      lastEventAt: last.createdAt,
      eventCount: sorted.length,
    })
  }

  return out.sort((a, b) => b.lastEventAt.localeCompare(a.lastEventAt))
}
