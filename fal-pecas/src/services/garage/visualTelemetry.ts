/**
 * Observabilidade mínima Camada 2 — sem PII.
 * Ring buffer em memória + console.debug; sem enviar identity/customer/placa.
 */

export type VisualTelemetryEvent = {
  at: string
  source: '2d' | 'procedural' | 'glb'
  outcome: 'ok' | 'fallback' | 'error' | 'skip'
  /** Código do asset (não é PII). */
  assetCode?: string
  durationMs?: number
  reason?: string
  reducedMotion?: boolean
}

const MAX = 40
const buffer: VisualTelemetryEvent[] = []

export function recordVisualTelemetry(event: Omit<VisualTelemetryEvent, 'at'>): VisualTelemetryEvent {
  const full: VisualTelemetryEvent = {
    ...event,
    at: new Date().toISOString(),
  }
  buffer.push(full)
  if (buffer.length > MAX) buffer.shift()
  if (typeof console !== 'undefined' && typeof console.debug === 'function') {
    console.debug('[fal-visual]', full.source, full.outcome, full.durationMs ?? '', full.reason ?? '')
  }
  return full
}

export function listVisualTelemetry(): readonly VisualTelemetryEvent[] {
  return [...buffer]
}

export function clearVisualTelemetry(): void {
  buffer.length = 0
}

/** Garante que payload de telemetria não carrega campos sensíveis. */
export function telemetryHasNoPii(event: VisualTelemetryEvent): boolean {
  const json = JSON.stringify(event).toLowerCase()
  const banned = ['customer', 'email', 'plate', 'placa', 'cpf', 'phone', 'telefone', 'identity_id']
  return !banned.some((b) => json.includes(b))
}
