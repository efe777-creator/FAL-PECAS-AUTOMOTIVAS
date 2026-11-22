/**
 * R3 — snapshot informativo da consulta de placa (não é VehicleFilter / PVC).
 */

export type PlateSourceSnapshot = {
  plate: string | null
  queriedAt: string | null
  source: string | null
  status: string | null
  maker: string | null
  model: string | null
  year: string | null
  yearModel: string | null
  yearFabrication: string | null
  engine: string | null
  version: string | null
  engineRaw: string | null
  versionRaw: string | null
  fuel: string | null
  transmission: string | null
  confidence: number | null
}

export function buildPlateSourceSnapshot(input: {
  plate?: string | null
  queriedAt?: string | null
  source?: string | null
  status?: string | null
  maker?: string | null
  model?: string | null
  year?: string | number | null
  yearModel?: string | number | null
  yearFabrication?: string | number | null
  engine?: string | null
  version?: string | null
  engineRaw?: string | null
  versionRaw?: string | null
  fuel?: string | null
  transmission?: string | null
  confidence?: number | null
}): PlateSourceSnapshot {
  const year =
    input.year != null && String(input.year).trim() ? String(input.year) : null
  const yearModel =
    input.yearModel != null && String(input.yearModel).trim()
      ? String(input.yearModel)
      : year
  const yearFabrication =
    input.yearFabrication != null && String(input.yearFabrication).trim()
      ? String(input.yearFabrication)
      : null
  return {
    plate: input.plate?.trim() || null,
    queriedAt: input.queriedAt ?? new Date().toISOString(),
    source: input.source ?? null,
    status: input.status ?? null,
    maker: input.maker?.trim() || null,
    model: input.model?.trim() || null,
    year: yearModel ?? year,
    yearModel: yearModel ?? year,
    yearFabrication,
    engine: input.engine?.trim() || null,
    version: input.version?.trim() || null,
    engineRaw: input.engineRaw?.trim() || null,
    versionRaw: input.versionRaw?.trim() || null,
    fuel: input.fuel?.trim() || null,
    transmission: input.transmission?.trim() || null,
    confidence: typeof input.confidence === 'number' ? input.confidence : null,
  }
}

export function parsePlateSourceSnapshot(raw: unknown): PlateSourceSnapshot | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const o = raw as Record<string, unknown>
  // Exige pelo menos maker+model ou plate para considerar snapshot útil.
  const maker = typeof o.maker === 'string' ? o.maker : null
  const model = typeof o.model === 'string' ? o.model : null
  const plate = typeof o.plate === 'string' ? o.plate : null
  if (!maker && !model && !plate) return null
  return buildPlateSourceSnapshot({
    plate,
    queriedAt: typeof o.queriedAt === 'string' ? o.queriedAt : null,
    source: typeof o.source === 'string' ? o.source : null,
    status: typeof o.status === 'string' ? o.status : null,
    maker,
    model,
    year: o.year != null ? String(o.year) : null,
    yearModel: o.yearModel != null ? String(o.yearModel) : null,
    yearFabrication: o.yearFabrication != null ? String(o.yearFabrication) : null,
    engine: typeof o.engine === 'string' ? o.engine : null,
    version: typeof o.version === 'string' ? o.version : null,
    engineRaw: typeof o.engineRaw === 'string' ? o.engineRaw : null,
    versionRaw: typeof o.versionRaw === 'string' ? o.versionRaw : null,
    fuel: typeof o.fuel === 'string' ? o.fuel : null,
    transmission: typeof o.transmission === 'string' ? o.transmission : null,
    confidence: typeof o.confidence === 'number' ? o.confidence : null,
  })
}

/** Linha informativa para UI (fora do filtro PVC). */
export function formatSourceSnapshotExtras(
  snap: {
    yearModel?: string | null
    yearFabrication?: string | null
    fuel?: string | null
    transmission?: string | null
  } | null | undefined,
): string | null {
  if (!snap) return null
  const dualYear =
    snap.yearFabrication &&
    snap.yearModel &&
    snap.yearFabrication !== snap.yearModel
      ? `Fab ${snap.yearFabrication} / modelo ${snap.yearModel}`
      : null
  const parts = [
    dualYear,
    snap.fuel ? `Combustível: ${snap.fuel}` : null,
    snap.transmission ? `Câmbio: ${snap.transmission}` : null,
  ].filter(Boolean)
  return parts.length ? parts.join(' · ') : null
}
