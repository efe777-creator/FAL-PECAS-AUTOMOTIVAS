/**
 * Pórtico de fontes do mestre (padrão FAL: motor + adaptadores).
 * v1: CSV fipeX. Slot para API paga (π) no futuro.
 */
import {
  normalizeFipeXToFalCsv,
  type FalVehicleMasterCsvRow,
} from '@/services/admin/fipeXToFalVehicleMasterCsv'
import type { MasterIntelligenceRow } from '@/services/vehicles/vehicleMasterIntelligence'

export type VehicleMasterSourceKind = 'fipex_csv' | 'fipe_api' | 'paid_api_future'

export type VehicleMasterSourceResult = {
  kind: VehicleMasterSourceKind
  rows: MasterIntelligenceRow[]
  skipped: number
  fileErrors: string[]
  /** Meta ops (ex.: última sync). */
  meta?: Record<string, string | number | boolean | null>
}

export interface VehicleMasterSource {
  readonly kind: VehicleMasterSourceKind
  fetchNormalizedRows(input: unknown): Promise<VehicleMasterSourceResult>
}

function toIntelligenceRows(rows: FalVehicleMasterCsvRow[]): MasterIntelligenceRow[] {
  return rows.map((r) => ({
    montadora: r.montadora,
    modelo: r.modelo,
    ano: r.ano,
    motor: r.motor,
    versao: r.versao,
    combustivel: '',
  }))
}

/** Adaptador fipeX (dump CSV no browser / job). */
export const fipeXCsvVehicleMasterSource: VehicleMasterSource = {
  kind: 'fipex_csv',
  async fetchNormalizedRows(input: unknown): Promise<VehicleMasterSourceResult> {
    const text = typeof input === 'string' ? input : String(input ?? '')
    const out = normalizeFipeXToFalCsv(text)
    return {
      kind: 'fipex_csv',
      rows: toIntelligenceRows(out.rows),
      skipped: out.skipped,
      fileErrors: out.fileErrors,
      meta: { source: 'fipex_csv' },
    }
  },
}

/**
 * Fonte FIPE API — fetch real via Edge `fipe-catalog-lookup` no client admin
 * (`fipeCatalogClient`). Este adaptador só documenta o kind no pórtico.
 */
export const fipeApiVehicleMasterSource: VehicleMasterSource = {
  kind: 'fipe_api',
  async fetchNormalizedRows(): Promise<VehicleMasterSourceResult> {
    return {
      kind: 'fipe_api',
      rows: [],
      skipped: 0,
      fileErrors: [
        'Use a tela Consultar e escolher (modo FIPE) — cascata marca/modelo/anos via Edge.',
      ],
      meta: { source: 'fipe_api', ready: true },
    }
  },
}

/** Placeholder legado. */
export const paidApiVehicleMasterSourceStub: VehicleMasterSource = {
  kind: 'paid_api_future',
  async fetchNormalizedRows(): Promise<VehicleMasterSourceResult> {
    return {
      kind: 'paid_api_future',
      rows: [],
      skipped: 0,
      fileErrors: ['Use fipe_api / Consultar e escolher.'],
      meta: { source: 'paid_api_future', ready: false },
    }
  },
}

export function resolveVehicleMasterSource(
  kind: VehicleMasterSourceKind = 'fipex_csv',
): VehicleMasterSource {
  if (kind === 'fipe_api') return fipeApiVehicleMasterSource
  if (kind === 'paid_api_future') return paidApiVehicleMasterSourceStub
  return fipeXCsvVehicleMasterSource
}

/** Chave localStorage — última sync no hub. */
export const VEHICLE_MASTER_SYNC_META_KEY = 'fal.admin.vehicleMaster.lastSync'

export type VehicleMasterSyncMeta = {
  at: string
  upserted: number
  productionMerged: number
  errors: number
  skipped: number
  source: string
}

export function readVehicleMasterSyncMeta(): VehicleMasterSyncMeta | null {
  try {
    const raw = localStorage.getItem(VEHICLE_MASTER_SYNC_META_KEY)
    if (!raw) return null
    return JSON.parse(raw) as VehicleMasterSyncMeta
  } catch {
    return null
  }
}

export function writeVehicleMasterSyncMeta(meta: VehicleMasterSyncMeta): void {
  try {
    localStorage.setItem(VEHICLE_MASTER_SYNC_META_KEY, JSON.stringify(meta))
  } catch {
    /* ignore quota */
  }
}
