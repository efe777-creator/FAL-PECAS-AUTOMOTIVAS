/**
 * Adaptador uniforme de fontes → contrato interno do mestre.
 * Não grava vehicle_versions; entrega linhas normalizadas ao resolvedor/importador.
 */
import type { VehicleImportPreviewRow } from '@/services/admin/adminVehicleImportBatchService'
import { normalizeVehicleFuel } from '@/lib/vehicles/normalizeVehicleFuel'
import { normalizeVehicleTransmission } from '@/lib/vehicles/normalizeVehicleTransmission'
import { normalizeVehicleTraction } from '@/lib/vehicles/normalizeVehicleTraction'
import { normalizeBodyConfiguration } from '@/lib/vehicles/normalizeVehicleBodyConfig'
import { normalizeVehicleMasterInput } from '@/services/vehicles/normalizeVehicleMasterInput'

export type VehicleSourceAdapterKind = 'fipe' | 'plate' | 'fipex_csv' | 'manual' | 'other'

export type AdaptedVehicleSourceRow = VehicleImportPreviewRow & {
  sourceKind: VehicleSourceAdapterKind
  externalId?: string | null
  original: Record<string, unknown>
}

export function adaptRawVehicleSourceRow(
  sourceKind: VehicleSourceAdapterKind,
  raw: Record<string, unknown>,
): AdaptedVehicleSourceRow | null {
  const maker = String(raw.maker ?? raw.marca ?? raw.brand ?? '').trim()
  const model = String(raw.model ?? raw.modelo ?? '').trim()
  const yearRaw = raw.year ?? raw.ano ?? raw.ano_modelo
  const yearN =
    yearRaw == null || yearRaw === ''
      ? null
      : Math.trunc(Number(yearRaw))
  const engine = (raw.engine ?? raw.motor ?? null) as string | null
  const version = (raw.version ?? raw.versao ?? raw.version_name ?? null) as string | null

  const normalized = normalizeVehicleMasterInput({
    maker,
    model,
    engine: engine ?? undefined,
    version: version ?? undefined,
  })
  if (normalized.outcome === 'reject') return null

  return {
    sourceKind,
    externalId: raw.external_id != null ? String(raw.external_id) : raw.codigo_fipe != null ? String(raw.codigo_fipe) : null,
    maker: normalized.maker,
    model: normalized.model,
    year: yearN != null && Number.isFinite(yearN) ? yearN : null,
    engine: normalized.engine,
    version: normalized.version,
    fuel: normalizeVehicleFuel(
      raw.fuel != null ? String(raw.fuel) : raw.combustivel != null ? String(raw.combustivel) : null,
    ),
    transmission: normalizeVehicleTransmission(
      raw.transmission != null
        ? String(raw.transmission)
        : raw.cambio != null
          ? String(raw.cambio)
          : normalized.transmission,
    ),
    traction: normalizeVehicleTraction(
      raw.traction != null
        ? String(raw.traction)
        : raw.tracao != null
          ? String(raw.tracao)
          : normalized.drivetrain,
    ),
    bodyConfiguration: normalizeBodyConfiguration(
      raw.body_configuration != null
        ? String(raw.body_configuration)
        : raw.body != null
          ? String(raw.body)
          : normalized.body,
    ),
    original: raw,
  }
}

export function adaptRawVehicleSourceBatch(
  sourceKind: VehicleSourceAdapterKind,
  rows: Record<string, unknown>[],
): AdaptedVehicleSourceRow[] {
  const out: AdaptedVehicleSourceRow[] = []
  for (const raw of rows) {
    const adapted = adaptRawVehicleSourceRow(sourceKind, raw)
    if (adapted) out.push(adapted)
  }
  return out
}
