/** Detecta sinal de entrega no metadata ME (sem auto-deliver). */

export function meReportsDelivered(
  metadata: Record<string, unknown> | null | undefined,
): boolean {
  if (!metadata || typeof metadata !== 'object') return false
  const me = metadata.me
  if (!me || typeof me !== 'object') return false
  const m = me as Record<string, unknown>
  const last = String(m.last_webhook_event ?? '').toLowerCase()
  if (/delivered|entregue/.test(last)) return true
  const events = m.tracking_events
  if (!Array.isArray(events)) return false
  return events.some((e) => {
    if (!e || typeof e !== 'object') return false
    const ev = String((e as { event?: string }).event ?? '').toLowerCase()
    return /delivered|entregue/.test(ev)
  })
}
