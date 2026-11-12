/**
 * Marcha 8 / G8 — frete cobrado do cliente vs custo efetivo do caminho.
 * charged = orders.shipping_amount
 * effective = ME label_amount OU custo own registrado
 */

export type FreightCostSource = 'me_label' | 'own_ops' | 'manual' | 'pending'

export type FreightFinanceSnapshot = {
  chargedShipping: number
  effectiveCost: number | null
  costSource: FreightCostSource
  delta: number | null
  recordedAt?: string | null
  recordedBy?: string | null
  note?: string | null
}

export function buildFreightFinanceSnapshot(input: {
  chargedShipping: number
  effectiveCost: number | null
  costSource: FreightCostSource
  recordedAt?: string | null
  recordedBy?: string | null
  note?: string | null
}): FreightFinanceSnapshot {
  const charged = Number(input.chargedShipping) || 0
  const cost =
    input.effectiveCost == null || !Number.isFinite(Number(input.effectiveCost))
      ? null
      : Number(Number(input.effectiveCost).toFixed(2))
  return {
    chargedShipping: Number(charged.toFixed(2)),
    effectiveCost: cost,
    costSource: input.costSource,
    delta: cost == null ? null : Number((charged - cost).toFixed(2)),
    recordedAt: input.recordedAt ?? null,
    recordedBy: input.recordedBy ?? null,
    note: input.note ?? null,
  }
}

/** G8 mínimo: cobrado + custo efetivo do caminho registrados. */
export function isG8FreightFinanceComplete(
  snap: FreightFinanceSnapshot | null | undefined,
): boolean {
  if (!snap) return false
  if (snap.costSource === 'pending') return false
  if (snap.effectiveCost == null) return false
  if (!Number.isFinite(snap.chargedShipping)) return false
  return true
}

export function parseFreightFinance(
  metadata: Record<string, unknown> | null | undefined,
): FreightFinanceSnapshot | null {
  const raw = metadata?.finance
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const sourceRaw = String(o.cost_source ?? o.costSource ?? 'pending')
  const costSource: FreightCostSource =
    sourceRaw === 'me_label' ||
    sourceRaw === 'own_ops' ||
    sourceRaw === 'manual' ||
    sourceRaw === 'pending'
      ? sourceRaw
      : 'pending'
  const effective =
    o.effective_cost != null
      ? Number(o.effective_cost)
      : o.effectiveCost != null
        ? Number(o.effectiveCost)
        : null
  return buildFreightFinanceSnapshot({
    chargedShipping: Number(o.charged_shipping ?? o.chargedShipping ?? 0),
    effectiveCost: effective != null && Number.isFinite(effective) ? effective : null,
    costSource,
    recordedAt: o.recorded_at != null ? String(o.recorded_at) : o.recordedAt != null ? String(o.recordedAt) : null,
    recordedBy: o.recorded_by != null ? String(o.recorded_by) : o.recordedBy != null ? String(o.recordedBy) : null,
    note: o.note != null ? String(o.note) : null,
  })
}

/** Payload jsonb para gravar em shipments.metadata.finance */
export function freightFinanceToMeta(snap: FreightFinanceSnapshot): Record<string, unknown> {
  return {
    charged_shipping: snap.chargedShipping,
    effective_cost: snap.effectiveCost,
    cost_source: snap.costSource,
    delta: snap.delta,
    recorded_at: snap.recordedAt ?? new Date().toISOString(),
    recorded_by: snap.recordedBy ?? null,
    note: snap.note ?? null,
  }
}

export const FREIGHT_COST_SOURCE_LABEL: Record<FreightCostSource, string> = {
  me_label: 'Custo etiqueta Melhor Envio',
  own_ops: 'Custo entrega própria',
  manual: 'Custo manual',
  pending: 'Pendente',
}
