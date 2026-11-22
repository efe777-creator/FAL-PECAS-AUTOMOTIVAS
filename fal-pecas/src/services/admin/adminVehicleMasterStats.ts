import { getSupabase } from '@/lib/supabase'

export type VehicleMasterStats = {
  manufacturersActive: number
  modelsActive: number
  versionsActive: number
  /** Modelos com production_year_start preenchido (vida de linha). */
  modelsWithProductionYears: number
  /** Qualidade do mestre de modelos (todas as linhas, qualquer status). */
  qualityVerified: number
  qualityReview: number
  qualityQuarantined: number
  qualitySuperseded: number
  /**
   * Verified+active com 0 VV ativo (casca nominal — ex. Corolla Cross sem config).
   * Não é review: nome ok, riqueza insuficiente.
   */
  verifiedThinShells: number
  /** Verified com start=end (vida pontual residual — seletor pobre). */
  verifiedPointLife: number
}

export type VehicleModelQualityStatus = 'review' | 'verified' | 'quarantined' | 'superseded'

export type VehicleReviewQueueItem = {
  id: string
  name: string
  makerName: string
  qualityStatus: 'review' | 'quarantined'
  vehicleClass: string
  reviewNote: string | null
  evidenceKind: string | null
  /** Aplicações (PVC) nas configurações do modelo; null se não disponível. */
  pvcCount: number | null
  /** Veículos de clientes apontando para o modelo; null se não disponível. */
  customerVehicleCount: number | null
}

async function countActive(table: string): Promise<number> {
  const { count, error } = await getSupabase()
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq('status', 'active')
  if (error) throw error
  return count ?? 0
}

async function countQuality(status: VehicleModelQualityStatus): Promise<number> {
  const { count, error } = await getSupabase()
    .from('models')
    .select('id', { count: 'exact', head: true })
    .eq('quality_status', status)
  if (error) throw error
  return count ?? 0
}

/** Contagens ativas do mestre (montadoras / modelos / vehicle_versions) + qualidade. */
export async function adminFetchVehicleMasterStats(): Promise<VehicleMasterStats> {
  const [
    manufacturersActive,
    modelsActive,
    versionsActive,
    withLife,
    qualityVerified,
    qualityReview,
    qualityQuarantined,
    qualitySuperseded,
    thinShells,
    pointLife,
  ] = await Promise.all([
    countActive('manufacturers'),
    countActive('models'),
    countActive('vehicle_versions'),
    getSupabase()
      .from('models')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active')
      .not('production_year_start', 'is', null),
    countQuality('verified'),
    countQuality('review'),
    countQuality('quarantined'),
    countQuality('superseded'),
    countVerifiedThinShells(),
    countVerifiedPointLife(),
  ])
  if (withLife.error) throw withLife.error
  return {
    manufacturersActive,
    modelsActive,
    versionsActive,
    modelsWithProductionYears: withLife.count ?? 0,
    qualityVerified,
    qualityReview,
    qualityQuarantined,
    qualitySuperseded,
    verifiedThinShells: thinShells,
    verifiedPointLife: pointLife,
  }
}

export type VehicleThinShellItem = {
  id: string
  name: string
  makerName: string
  reviewNote: string | null
}

async function loadVerifiedThinShellRows(): Promise<VehicleThinShellItem[]> {
  const sb = getSupabase()
  const { data: models, error: e1 } = await sb
    .from('models')
    .select('id, name, review_note, manufacturers(name)')
    .eq('status', 'active')
    .eq('quality_status', 'verified')
    .order('name')
  if (e1) throw e1
  const rows = models ?? []
  if (!rows.length) return []
  const ids = rows.map((m) => String(m.id))
  const { data: vvs, error: e2 } = await sb
    .from('vehicle_versions')
    .select('model_id')
    .eq('status', 'active')
    .in('model_id', ids)
  if (e2) throw e2
  const withVv = new Set((vvs ?? []).map((v) => String(v.model_id)))
  return rows
    .filter((m) => !withVv.has(String(m.id)))
    .map((m) => {
      const mk = m.manufacturers
      const first = Array.isArray(mk) ? mk[0] : mk
      return {
        id: String(m.id),
        name: String(m.name),
        makerName: String(first?.name ?? '—'),
        reviewNote: m.review_note ? String(m.review_note) : null,
      }
    })
}

/** Verified ativos sem nenhuma VV ativa (casca). */
async function countVerifiedThinShells(): Promise<number> {
  return (await loadVerifiedThinShellRows()).length
}

/** Lista cascas verified (0 VV) — ex. Corolla Cross aguardando configs. */
export async function listVerifiedThinShells(): Promise<VehicleThinShellItem[]> {
  return loadVerifiedThinShellRows()
}

/** Verified ativos com vida pontual (start=end) — seletor não abre faixa. */
async function countVerifiedPointLife(): Promise<number> {
  const { data, error } = await getSupabase()
    .from('models')
    .select('id, production_year_start, production_year_end')
    .eq('status', 'active')
    .eq('quality_status', 'verified')
    .not('production_year_start', 'is', null)
    .not('production_year_end', 'is', null)
  if (error) throw error
  return (data ?? []).filter(
    (r) =>
      r.production_year_start != null &&
      r.production_year_end != null &&
      Number(r.production_year_start) === Number(r.production_year_end),
  ).length
}

type QueueRow = {
  id: string
  name: string
  quality_status: string
  vehicle_class?: string | null
  review_note?: string | null
  evidence_kind?: string | null
  manufacturers?: { name?: string } | { name?: string }[] | null
  customer_vehicles?: { count?: number }[] | null
  vehicle_versions?: { product_vehicle_compatibility?: { count?: number }[] | null }[] | null
}

function makerNameOf(value: QueueRow['manufacturers']): string {
  const first = Array.isArray(value) ? value[0] : value
  return String(first?.name ?? '—')
}

export function mapReviewQueueRow(row: QueueRow): VehicleReviewQueueItem {
  const cv = row.customer_vehicles
  const customerVehicleCount = Array.isArray(cv)
    ? cv.reduce((sum, c) => sum + Number(c?.count ?? 0), 0)
    : null
  const vvs = row.vehicle_versions
  const pvcCount = Array.isArray(vvs)
    ? vvs.reduce(
        (sum, vv) =>
          sum +
          (vv.product_vehicle_compatibility ?? []).reduce(
            (s, p) => s + Number(p?.count ?? 0),
            0,
          ),
        0,
      )
    : null
  return {
    id: row.id,
    name: row.name,
    makerName: makerNameOf(row.manufacturers),
    qualityStatus: row.quality_status === 'quarantined' ? 'quarantined' : 'review',
    vehicleClass: row.vehicle_class ?? 'unknown',
    reviewNote: row.review_note ?? null,
    evidenceKind: row.evidence_kind ?? null,
    pvcCount,
    customerVehicleCount,
  }
}

const QUEUE_BASE_COLS =
  'id, name, quality_status, vehicle_class, review_note, evidence_kind, manufacturers(name)'

/**
 * Fila de revisão: modelos em review/quarantined (admin, sem filtro público).
 * Contagens PVC/clientes são best-effort (embed PostgREST); se falhar, vêm null.
 */
export async function listReviewQueue(limit = 100): Promise<VehicleReviewQueueItem[]> {
  const statuses = ['quarantined', 'review']
  const withCounts = await getSupabase()
    .from('models')
    .select(
      `${QUEUE_BASE_COLS}, customer_vehicles(count), vehicle_versions(product_vehicle_compatibility(count))`,
    )
    .in('quality_status', statuses)
    .order('quality_status', { ascending: true })
    .order('name')
    .limit(limit)
  if (!withCounts.error) {
    return ((withCounts.data ?? []) as unknown as QueueRow[]).map(mapReviewQueueRow)
  }
  const plain = await getSupabase()
    .from('models')
    .select(QUEUE_BASE_COLS)
    .in('quality_status', statuses)
    .order('quality_status', { ascending: true })
    .order('name')
    .limit(limit)
  if (plain.error) throw plain.error
  return ((plain.data ?? []) as unknown as QueueRow[]).map(mapReviewQueueRow)
}
