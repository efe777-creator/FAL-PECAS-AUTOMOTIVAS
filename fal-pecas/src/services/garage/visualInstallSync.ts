/**
 * PLANO 2B E4 — sync opcional: instalação 2A → refletir no modelo.
 * Direção única: 2A → visual. Nunca cria/altera evento 2A a partir do viewer.
 */

import type { VehicleEventRow } from '@/services/garage/vehicleEventService'
import type { VehicleValidationState } from '@/services/garage/vehicleEventTypes'
import type { VehiclePartEvent } from '@/services/garage/vehiclePartEventService'
import type { VisualPartPreview } from '@/services/garage/vehicleVisualPartPreview'
import { eventProductLabel } from '@/services/garage/vehiclePartEventService'

export type VisualInstallFact = {
  id: string
  source: 'g7' | 'vehicle_event'
  title: string
  productId: string | null
  orderId: string | null
  validationState: VehicleValidationState
  occurredAt: string
}

/** Estados que NÃO devem espelhar no modelo. */
export function isEligibleInstallValidation(state: VehicleValidationState): boolean {
  return state !== 'rejeitado' && state !== 'contestado'
}

export function collectInstallFactsFromG7(events: VehiclePartEvent[]): VisualInstallFact[] {
  return events
    .filter((e) => e.eventType === 'installed_declared')
    .map((e) => ({
      id: `g7:${e.id}`,
      source: 'g7' as const,
      title: eventProductLabel(e),
      productId: e.productId,
      orderId: e.orderId,
      validationState: 'declarado' as const,
      occurredAt: e.createdAt,
    }))
}

export function collectInstallFactsFromEvents(events: VehicleEventRow[]): VisualInstallFact[] {
  return events
    .filter((e) => e.category === 'instalacao' && isEligibleInstallValidation(e.validationState))
    .map((e) => ({
      id: `ve:${e.id}`,
      source: 'vehicle_event' as const,
      title: e.title,
      productId: typeof e.originRef.product_id === 'string' ? e.originRef.product_id : null,
      orderId: typeof e.originRef.order_id === 'string' ? e.originRef.order_id : null,
      validationState: e.validationState,
      occurredAt: e.occurredAt,
    }))
}

export function mergeInstallFacts(a: VisualInstallFact[], b: VisualInstallFact[]): VisualInstallFact[] {
  const map = new Map<string, VisualInstallFact>()
  for (const f of [...a, ...b]) {
    const prev = map.get(f.id)
    if (!prev || prev.occurredAt < f.occurredAt) map.set(f.id, f)
  }
  return [...map.values()].sort((x, y) =>
    x.occurredAt < y.occurredAt ? 1 : x.occurredAt > y.occurredAt ? -1 : 0,
  )
}

/**
 * Peças a refletir no modelo 2D/3D.
 * Sync OFF → lista vazia (aparência sem marcadores de instalação).
 * Sync ON → só itens instalados que batem com fato 2A elegível (ou state instalada G7).
 */
export function partsForModelReflection(
  parts: VisualPartPreview[],
  facts: VisualInstallFact[],
  syncEnabled: boolean,
): VisualPartPreview[] {
  if (!syncEnabled) return []
  const productIds = new Set(facts.map((f) => f.productId).filter((x): x is string => Boolean(x)))
  return parts.filter((p) => {
    if (p.state !== 'instalada') return false
    if (p.productId && productIds.has(p.productId)) return true
    // G7 instalada sem product_id ainda conta se houver fato g7 correspondente por key
    return facts.some((f) => f.source === 'g7' && (f.productId === p.productId || !p.productId))
  })
}

/** Fatos 2A (vehicle_event) sem peça G7 correspondente — ainda podem aparecer no modelo. */
export function orphanInstallFacts(
  facts: VisualInstallFact[],
  parts: VisualPartPreview[],
): VisualInstallFact[] {
  const productIds = new Set(parts.map((p) => p.productId).filter((x): x is string => Boolean(x)))
  return facts.filter((f) => {
    if (f.source !== 'vehicle_event') return false
    if (!f.productId) return true
    return !productIds.has(f.productId)
  })
}

export function visualSyncNeverWrites2A(): true {
  return true
}
