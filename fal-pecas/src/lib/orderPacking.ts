/** Packing neutro do pedido (CP-EMB) — shipments.metadata.packing */

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
}

export type OrderPacking = {
  volumes: OrderPackingVolume[]
  updatedAt?: string | null
  updatedBy?: string | null
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
    })
  }
  return {
    volumes,
    updatedAt: p.updatedAt != null ? String(p.updatedAt) : null,
    updatedBy: p.updatedBy != null ? String(p.updatedBy) : null,
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
  }))
}
