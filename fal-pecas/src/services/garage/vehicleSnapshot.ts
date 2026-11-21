import type { CartCompatDecision, CustomerSavedVehicle, VehicleFilter } from '@/types'

/** Contrato §6.3 — congelado no momento da associação ao item. */
export type VehicleSnapshot = {
  customerVehicleId: string | null
  maker: string
  model: string
  year: string | number | null
  version: string | null
  engine: string | null
  versionId: string | null
  /** Interno; na UI pública use maskPlateInSnapshot. */
  plate: string | null
  associatedAt: string
  contextSource: 'active' | 'manual' | 'suggested'
  /** E.5 lite — decisão de fit no checkout. */
  compatDecision?: CartCompatDecision | null
}

export function buildVehicleSnapshotFromActive(input: {
  vehicle: CustomerSavedVehicle
  contextSource?: VehicleSnapshot['contextSource']
}): VehicleSnapshot {
  const v = input.vehicle
  return {
    customerVehicleId: v.id,
    maker: v.makerName?.trim() || '',
    model: v.modelName?.trim() || '',
    year: v.year ?? null,
    version: v.versionName ?? null,
    engine: v.engine ?? null,
    versionId: v.versionId ?? null,
    plate: v.plate ?? null,
    associatedAt: new Date().toISOString(),
    contextSource: input.contextSource ?? 'active',
  }
}

/**
 * Vínculo compra → veículo da garagem (checkout).
 * Prioridade: item explícito → snapshot → veículo ativo.
 */
export function resolveOrderItemCustomerVehicleId(input: {
  itemCustomerVehicleId?: string | null
  snapshotCustomerVehicleId?: string | null
  activeVehicleId?: string | null
}): string | null {
  const fromItem = input.itemCustomerVehicleId?.trim()
  if (fromItem) return fromItem
  const fromSnap = input.snapshotCustomerVehicleId?.trim()
  if (fromSnap) return fromSnap
  const fromActive = input.activeVehicleId?.trim()
  return fromActive || null
}

export function buildVehicleSnapshotFromFilter(
  filter: VehicleFilter,
  opts?: { customerVehicleId?: string | null; contextSource?: VehicleSnapshot['contextSource'] },
): VehicleSnapshot | null {
  const maker = filter.maker?.trim()
  const model = filter.model?.trim()
  if (!maker || !model) return null
  return {
    customerVehicleId: opts?.customerVehicleId ?? null,
    maker,
    model,
    year: filter.year ?? null,
    version: filter.version ?? null,
    engine: filter.engine ?? null,
    versionId: filter.versionId ?? null,
    plate: filter.plate ?? null,
    associatedAt: new Date().toISOString(),
    contextSource: opts?.contextSource ?? 'manual',
  }
}

/** Máscara LGPD para UIs compartilháveis: GAF7*** */
export function maskPlate(raw: string | null | undefined): string | null {
  const t = (raw ?? '').replace(/[^A-Za-z0-9]/g, '').toUpperCase()
  if (!t) return null
  if (t.length <= 4) return `${t[0] ?? ''}***`
  return `${t.slice(0, 4)}***`
}

export function formatVehicleSnapshotLabel(
  snap: VehicleSnapshot | null | undefined,
  opts?: { maskPlate?: boolean },
): string | null {
  if (!snap?.maker || !snap?.model) return null
  const plate =
    opts?.maskPlate !== false ? maskPlate(snap.plate) : snap.plate?.trim() || null
  return [
    snap.maker,
    snap.model,
    snap.year,
    snap.engine,
    snap.version,
    plate ? `placa ${plate}` : null,
  ]
    .filter(Boolean)
    .join(' · ')
}

export function parseVehicleSnapshot(raw: unknown): VehicleSnapshot | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const maker = typeof o.maker === 'string' ? o.maker : ''
  const model = typeof o.model === 'string' ? o.model : ''
  if (!maker || !model) return null
  return {
    customerVehicleId:
      o.customerVehicleId == null || o.customerVehicleId === ''
        ? null
        : String(o.customerVehicleId),
    maker,
    model,
    year: (o.year as string | number | null) ?? null,
    version: o.version == null ? null : String(o.version),
    engine: o.engine == null ? null : String(o.engine),
    versionId: o.versionId == null ? null : String(o.versionId),
    plate: o.plate == null ? null : String(o.plate),
    associatedAt:
      typeof o.associatedAt === 'string' ? o.associatedAt : new Date().toISOString(),
    contextSource:
      o.contextSource === 'manual' || o.contextSource === 'suggested'
        ? o.contextSource
        : 'active',
    compatDecision: parseCompatDecision(o.compatDecision),
  }
}

function parseCompatDecision(raw: unknown): CartCompatDecision | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const action = o.action
  if (
    action !== 'continue_unconfirmed' &&
    action !== 'continue_incompatible' &&
    action !== 'confirmed'
  ) {
    return null
  }
  const sealLabel = typeof o.sealLabel === 'string' ? o.sealLabel : ''
  if (!sealLabel) return null
  return {
    sealLabel,
    action,
    motivo: o.motivo == null ? null : String(o.motivo),
    faltante: o.faltante == null ? null : String(o.faltante),
    at: typeof o.at === 'string' ? o.at : new Date().toISOString(),
  }
}
