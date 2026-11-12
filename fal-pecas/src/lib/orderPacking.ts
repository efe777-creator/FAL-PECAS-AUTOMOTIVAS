/** Packing neutro do pedido (CP-EMB + Marcha 3 alocação) — shipments.metadata.packing */

export type PackingAllocationLine = {
  orderItemId: string
  quantity: number
}

export type PackingAllocationException = {
  active: boolean
  reason: string
  authorizedBy?: string | null
  at?: string | null
}

export type OrderPackingVolume = {
  id: string
  lengthCm: number
  widthCm: number
  heightCm: number
  weightKg: number
  unitLength: 'cm'
  unitWeight: 'kg'
  operatorId?: string | null
  recordedAt?: string | null
  notes?: string | null
  boxTemplateId?: string | null
  /** Unidades deste volume: soma por orderItemId em todos os volumes = qty do pedido. */
  lines: PackingAllocationLine[]
}

export type PackingAllocationStatus = 'incomplete' | 'complete' | 'exception' | 'invalid'

export type OrderPacking = {
  volumes: OrderPackingVolume[]
  updatedAt?: string | null
  updatedBy?: string | null
  /** Fingerprint dos itens no momento do save — diverge se qty/itens mudarem. */
  itemsFingerprint?: string | null
  allocationStatus?: PackingAllocationStatus | null
  allocationException?: PackingAllocationException | null
}

export type OrderItemQty = {
  id: string
  quantity: number
}

export function emptyPackingVolume(): OrderPackingVolume {
  return {
    id: crypto.randomUUID(),
    lengthCm: 20,
    widthCm: 15,
    heightCm: 10,
    weightKg: 0.5,
    unitLength: 'cm',
    unitWeight: 'kg',
    notes: '',
    boxTemplateId: null,
    recordedAt: new Date().toISOString(),
    lines: [],
  }
}

function parseLines(raw: unknown): PackingAllocationLine[] {
  if (!Array.isArray(raw)) return []
  const out: PackingAllocationLine[] = []
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue
    const o = row as Record<string, unknown>
    const orderItemId = String(o.orderItemId ?? o.order_item_id ?? '')
    const quantity = Number(o.quantity ?? 0)
    if (!orderItemId || !Number.isFinite(quantity) || quantity <= 0) continue
    out.push({ orderItemId, quantity })
  }
  return out
}

function parseException(raw: unknown): PackingAllocationException | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  return {
    active: Boolean(o.active),
    reason: o.reason != null ? String(o.reason) : '',
    authorizedBy: o.authorizedBy != null ? String(o.authorizedBy) : o.authorized_by != null ? String(o.authorized_by) : null,
    at: o.at != null ? String(o.at) : null,
  }
}

export function parseOrderPacking(metadata: Record<string, unknown> | null | undefined): OrderPacking {
  const raw = metadata?.packing
  if (!raw || typeof raw !== 'object') return { volumes: [] }
  const p = raw as Record<string, unknown>
  const vols = Array.isArray(p.volumes) ? p.volumes : []
  const volumes: OrderPackingVolume[] = []
  for (const v of vols) {
    if (!v || typeof v !== 'object') continue
    const o = v as Record<string, unknown>
    const id = String(o.id ?? '')
    if (!id) continue
    volumes.push({
      id,
      lengthCm: Number(o.lengthCm ?? 0),
      widthCm: Number(o.widthCm ?? 0),
      heightCm: Number(o.heightCm ?? 0),
      weightKg: Number(o.weightKg ?? 0),
      unitLength: 'cm',
      unitWeight: 'kg',
      operatorId: o.operatorId != null ? String(o.operatorId) : null,
      recordedAt: o.recordedAt != null ? String(o.recordedAt) : null,
      notes: o.notes != null ? String(o.notes) : '',
      boxTemplateId: o.boxTemplateId != null ? String(o.boxTemplateId) : null,
      lines: parseLines(o.lines),
    })
  }
  const statusRaw = p.allocationStatus ?? p.allocation_status
  const allocationStatus =
    statusRaw === 'complete' ||
    statusRaw === 'exception' ||
    statusRaw === 'invalid' ||
    statusRaw === 'incomplete'
      ? statusRaw
      : null
  return {
    volumes,
    updatedAt: p.updatedAt != null ? String(p.updatedAt) : null,
    updatedBy: p.updatedBy != null ? String(p.updatedBy) : null,
    itemsFingerprint:
      p.itemsFingerprint != null
        ? String(p.itemsFingerprint)
        : p.items_fingerprint != null
          ? String(p.items_fingerprint)
          : null,
    allocationStatus,
    allocationException: parseException(p.allocationException ?? p.allocation_exception),
  }
}

export function volumesToRpcPayload(volumes: OrderPackingVolume[]): unknown[] {
  return volumes.map((v) => ({
    id: v.id,
    lengthCm: v.lengthCm,
    widthCm: v.widthCm,
    heightCm: v.heightCm,
    weightKg: v.weightKg,
    unitLength: 'cm',
    unitWeight: 'kg',
    notes: v.notes ?? '',
    boxTemplateId: v.boxTemplateId ?? null,
    recordedAt: v.recordedAt ?? new Date().toISOString(),
    lines: (v.lines ?? []).map((l) => ({
      orderItemId: l.orderItemId,
      quantity: l.quantity,
    })),
  }))
}

/** Fingerprint estável: `itemId:qty|...` ordenado. */
export function buildItemsFingerprint(items: OrderItemQty[]): string {
  return [...items]
    .map((i) => `${i.id}:${Math.max(0, Math.floor(Number(i.quantity) || 0))}`)
    .sort()
    .join('|')
}

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

export function validatePackingAllocation(
  packing: OrderPacking,
  items: OrderItemQty[],
): { ok: boolean; reason?: string } {
  if (packing.allocationException?.active) {
    if (!String(packing.allocationException.reason ?? '').trim()) {
      return { ok: false, reason: 'Exceção de alocação exige justificativa' }
    }
    return { ok: true }
  }

  if (!items.length) {
    return { ok: false, reason: 'Pedido sem itens' }
  }

  const expected = new Map(items.map((i) => [i.id, Math.max(0, Math.floor(Number(i.quantity) || 0))]))
  for (const qty of expected.values()) {
    if (qty <= 0) return { ok: false, reason: 'Item com quantidade inválida' }
  }

  const allocated = new Map<string, number>()
  for (const vol of packing.volumes) {
    for (const line of vol.lines ?? []) {
      if (!expected.has(line.orderItemId)) {
        return { ok: false, reason: `Item ${line.orderItemId} não pertence ao pedido` }
      }
      const q = Math.floor(Number(line.quantity) || 0)
      if (q <= 0) return { ok: false, reason: 'Linha de alocação com quantidade inválida' }
      allocated.set(line.orderItemId, (allocated.get(line.orderItemId) ?? 0) + q)
    }
  }

  for (const [id, qty] of expected) {
    const got = allocated.get(id) ?? 0
    if (got !== qty) {
      return { ok: false, reason: `Item ${id}: alocado ${got}, pedido ${qty}` }
    }
  }

  for (const id of allocated.keys()) {
    if (!expected.has(id)) {
      return { ok: false, reason: `Alocação órfã ${id}` }
    }
  }

  return { ok: true }
}

/**
 * Packing completo Marcha 3: estrutural + (alocação exata OU exceção justificada)
 * + fingerprint coerente com itens atuais.
 */
export function isOrderPackingComplete(packing: OrderPacking, items: OrderItemQty[]): boolean {
  if (!isOrderPackingStructurallyComplete(packing)) return false
  const fp = buildItemsFingerprint(items)
  if (packing.itemsFingerprint && packing.itemsFingerprint !== fp) return false
  return validatePackingAllocation(packing, items).ok
}

/**
 * Gate de fila a partir só do metadata (sem reconsultar itens).
 * Confia no status gravado no save + fingerprint presente.
 * Fonte de verdade nas contagens SQL = order_packing_is_complete(order_id).
 */
export function packingCompleteFromMeta(
  metadata: Record<string, unknown> | null | undefined,
): boolean {
  const packing = parseOrderPacking(metadata ?? null)
  if (!isOrderPackingStructurallyComplete(packing)) return false
  if (packing.allocationStatus === 'invalid' || packing.allocationStatus === 'incomplete') {
    return false
  }
  if (packing.allocationException?.active) {
    return Boolean(String(packing.allocationException.reason ?? '').trim())
  }
  return packing.allocationStatus === 'complete' && Boolean(packing.itemsFingerprint)
}

/** Distribui 100% dos itens no primeiro volume (atalho UX). */
export function allocateAllToFirstVolume(
  packing: OrderPacking,
  items: OrderItemQty[],
): OrderPacking {
  if (!packing.volumes.length) return packing
  const [first, ...rest] = packing.volumes
  return {
    ...packing,
    volumes: [
      {
        ...first,
        lines: items
          .filter((i) => i.quantity > 0)
          .map((i) => ({ orderItemId: i.id, quantity: Math.floor(i.quantity) })),
      },
      ...rest.map((v) => ({ ...v, lines: [] })),
    ],
  }
}
