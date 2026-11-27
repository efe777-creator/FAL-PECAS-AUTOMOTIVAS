import { getSupabase } from '@/lib/supabase'
import { enrichVehicleVersionTech } from '@/services/vehicles/enrichVehicleVersionTech'
import { planTechAttributeEnrichment } from '@/services/vehicles/enrichVehicleAttributes'
import { vehicleCanonicalUpsert } from '@/services/vehicles/vehicleCanonicalUpsert'
import { adminListVersions } from '@/services/admin/adminVehicleService'

export type VehicleImportOperation =
  | 'create'
  | 'enrich'
  | 'unchanged'
  | 'conflict'
  | 'invalid'
  | 'ambiguous'

export type VehicleImportPreviewRow = {
  externalId?: string | null
  maker: string
  model: string
  year: number | null
  engine?: string | null
  version?: string | null
  fuel?: string | null
  transmission?: string | null
  traction?: string | null
  bodyConfiguration?: string | null
  raw?: Record<string, unknown>
}

export type ClassifiedImportItem = VehicleImportPreviewRow & {
  operation: VehicleImportOperation
  proposedEntityId?: string | null
  conflictDetails?: Record<string, unknown> | null
  validationErrors?: string[] | null
  payloadNormalized: Record<string, unknown>
}

function contentHash(rows: VehicleImportPreviewRow[]): string {
  const canon = JSON.stringify(
    rows.map((r) => ({
      e: r.externalId ?? '',
      mk: r.maker,
      mo: r.model,
      y: r.year,
      eng: r.engine ?? '',
      v: r.version ?? '',
      f: r.fuel ?? '',
      t: r.transmission ?? '',
      tr: r.traction ?? '',
      b: r.bodyConfiguration ?? '',
    })),
  )
  let h = 0
  for (let i = 0; i < canon.length; i++) h = (Math.imul(31, h) + canon.charCodeAt(i)) | 0
  return `h${(h >>> 0).toString(16)}`
}

/** Classifica linhas sem gravar o mestre. */
export async function classifyVehicleMasterImportRows(
  rows: VehicleImportPreviewRow[],
): Promise<ClassifiedImportItem[]> {
  const out: ClassifiedImportItem[] = []
  for (const row of rows) {
    const maker = row.maker?.trim() ?? ''
    const model = row.model?.trim() ?? ''
    const year = row.year
    const payloadNormalized = {
      maker,
      model,
      year,
      engine: row.engine ?? null,
      version: row.version ?? null,
      fuel: row.fuel ?? null,
      transmission: row.transmission ?? null,
      traction: row.traction ?? null,
      bodyConfiguration: row.bodyConfiguration ?? null,
    }
    if (!maker || !model) {
      out.push({
        ...row,
        operation: 'invalid',
        validationErrors: ['maker_and_model_required'],
        payloadNormalized,
      })
      continue
    }
    if (year == null || year < 1950 || year > 2100) {
      out.push({
        ...row,
        operation: 'invalid',
        validationErrors: ['year_required'],
        payloadNormalized,
      })
      continue
    }

    // Lookup leve: tenta upsert dry via listagem do modelo após match de nome (sem criar).
    // Classificação definitiva na apply usa o escritor canônico + enrich.
    try {
      const { data: makers } = await getSupabase()
        .from('manufacturers')
        .select('id')
        .ilike('name', maker)
        .limit(1)
      const makerId = (makers as { id: string }[] | null)?.[0]?.id
      if (!makerId) {
        out.push({ ...row, operation: 'create', payloadNormalized })
        continue
      }
      const { data: models } = await getSupabase()
        .from('models')
        .select('id')
        .eq('manufacturer_id', makerId)
        .ilike('name', model)
        .limit(2)
      const modelRows = (models as { id: string }[] | null) ?? []
      if (modelRows.length > 1) {
        out.push({
          ...row,
          operation: 'ambiguous',
          conflictDetails: { reason: 'multiple_models' },
          payloadNormalized,
        })
        continue
      }
      if (modelRows.length === 0) {
        out.push({ ...row, operation: 'create', payloadNormalized })
        continue
      }
      const versions = await adminListVersions(modelRows[0]!.id)
      const hits = versions.filter(
        (v) =>
          v.year === year &&
          (v.engine ?? null) === (row.engine?.trim() || null) &&
          (v.versionName ?? null) === (row.version?.trim() || null),
      )
      if (hits.length > 1) {
        out.push({
          ...row,
          operation: 'ambiguous',
          conflictDetails: { reason: 'multiple_versions' },
          payloadNormalized,
        })
        continue
      }
      if (hits.length === 0) {
        out.push({ ...row, operation: 'create', payloadNormalized })
        continue
      }
      const hit = hits[0]!
      const plan = planTechAttributeEnrichment(
        {
          fuel: hit.fuel,
          transmission: hit.transmission,
          traction: hit.traction,
          bodyConfiguration: hit.bodyConfiguration,
          vehicleClass: hit.vehicleClass,
        },
        {
          fuel: row.fuel,
          transmission: row.transmission,
          traction: row.traction,
          bodyConfiguration: row.bodyConfiguration,
        },
      )
      if (plan.conflicts.length) {
        out.push({
          ...row,
          operation: 'conflict',
          proposedEntityId: hit.id,
          conflictDetails: { conflicts: plan.conflicts },
          payloadNormalized,
        })
      } else if (plan.enriched.length) {
        out.push({
          ...row,
          operation: 'enrich',
          proposedEntityId: hit.id,
          payloadNormalized,
        })
      } else {
        out.push({
          ...row,
          operation: 'unchanged',
          proposedEntityId: hit.id,
          payloadNormalized,
        })
      }
    } catch {
      out.push({
        ...row,
        operation: 'invalid',
        validationErrors: ['classify_failed'],
        payloadNormalized,
      })
    }
  }
  return out
}

export async function adminCreateVehicleImportBatch(input: {
  sourceId: string
  fileName?: string | null
  rows: VehicleImportPreviewRow[]
  createdBy?: string | null
}): Promise<{ batchId: string; items: ClassifiedImportItem[]; contentHash: string }> {
  const classified = await classifyVehicleMasterImportRows(input.rows)
  const hash = contentHash(input.rows)

  const { data: prior } = await getSupabase()
    .from('vehicle_import_batches')
    .select('id, status')
    .eq('content_hash', hash)
    .eq('source_id', input.sourceId)
    .in('status', ['completed', 'preview'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Mesmo conteúdo já processado → marcar tudo unchanged na classificação se completed.
  if (prior && (prior as { status: string }).status === 'completed') {
    for (const item of classified) {
      if (item.operation === 'create' || item.operation === 'enrich') {
        item.operation = 'unchanged'
      }
    }
  }

  const counts = {
    total_records: classified.length,
    created_count: classified.filter((i) => i.operation === 'create').length,
    updated_count: classified.filter((i) => i.operation === 'enrich').length,
    unchanged_count: classified.filter((i) => i.operation === 'unchanged').length,
    conflict_count: classified.filter((i) => i.operation === 'conflict').length,
    error_count: classified.filter((i) => i.operation === 'invalid').length,
    ambiguous_count: classified.filter((i) => i.operation === 'ambiguous').length,
  }

  const { data: batch, error } = await getSupabase()
    .from('vehicle_import_batches')
    .insert({
      source_id: input.sourceId,
      file_name: input.fileName ?? null,
      content_hash: hash,
      status: 'preview',
      ...counts,
      created_by: input.createdBy ?? null,
      started_at: new Date().toISOString(),
    })
    .select('id')
    .single()
  if (error) throw error
  const batchId = String((batch as { id: string }).id)

  if (classified.length) {
    const { error: itemsErr } = await getSupabase().from('vehicle_import_items').insert(
      classified.map((i) => ({
        batch_id: batchId,
        external_id: i.externalId ?? null,
        proposed_entity_id: i.proposedEntityId ?? null,
        operation: i.operation,
        processing_status: 'pending',
        validation_errors: i.validationErrors ?? null,
        conflict_details: i.conflictDetails ?? null,
        payload_normalized: i.payloadNormalized,
      })),
    )
    if (itemsErr) throw itemsErr
  }

  return { batchId, items: classified, contentHash: hash }
}

/** Aplica só operações autorizadas (create/enrich). Conflitos/ambíguos não gravam. */
export async function adminApplyVehicleImportBatch(input: {
  batchId: string
  allowOperations?: Array<'create' | 'enrich'>
}): Promise<{
  created: number
  updated: number
  unchanged: number
  conflict: number
  error: number
}> {
  const allow = new Set(input.allowOperations ?? ['create', 'enrich'])
  const { data: items, error } = await getSupabase()
    .from('vehicle_import_items')
    .select('id, operation, payload_normalized, proposed_entity_id, processing_status')
    .eq('batch_id', input.batchId)
  if (error) throw error

  await getSupabase()
    .from('vehicle_import_batches')
    .update({ status: 'applying' })
    .eq('id', input.batchId)

  let created = 0
  let updated = 0
  let unchanged = 0
  let conflict = 0
  let errCount = 0

  for (const raw of (items ?? []) as Array<{
    id: string
    operation: string
    payload_normalized: Record<string, unknown>
    proposed_entity_id: string | null
    processing_status: string
  }>) {
    const op = raw.operation as VehicleImportOperation
    if (op === 'unchanged') {
      unchanged += 1
      await getSupabase()
        .from('vehicle_import_items')
        .update({ processing_status: 'skipped', processed_at: new Date().toISOString() })
        .eq('id', raw.id)
      continue
    }
    if (op === 'conflict' || op === 'ambiguous' || op === 'invalid') {
      if (op === 'conflict') conflict += 1
      else errCount += 1
      await getSupabase()
        .from('vehicle_import_items')
        .update({ processing_status: 'skipped', processed_at: new Date().toISOString() })
        .eq('id', raw.id)
      continue
    }
    if (!allow.has(op as 'create' | 'enrich')) {
      await getSupabase()
        .from('vehicle_import_items')
        .update({ processing_status: 'skipped', processed_at: new Date().toISOString() })
        .eq('id', raw.id)
      continue
    }
    try {
      const p = raw.payload_normalized
      if (op === 'create') {
        await vehicleCanonicalUpsert({
          maker: String(p.maker ?? ''),
          model: String(p.model ?? ''),
          year: p.year as number,
          engine: (p.engine as string | null) ?? null,
          version: (p.version as string | null) ?? null,
          fuel: (p.fuel as string | null) ?? null,
          source: 'import',
        })
        created += 1
      } else if (op === 'enrich' && raw.proposed_entity_id) {
        await enrichVehicleVersionTech(raw.proposed_entity_id, {
          fuel: (p.fuel as string | null) ?? null,
          transmission: (p.transmission as string | null) ?? null,
          traction: (p.traction as string | null) ?? null,
          bodyConfiguration: (p.bodyConfiguration as string | null) ?? null,
        })
        updated += 1
      }
      await getSupabase()
        .from('vehicle_import_items')
        .update({ processing_status: 'applied', processed_at: new Date().toISOString() })
        .eq('id', raw.id)
    } catch {
      errCount += 1
      await getSupabase()
        .from('vehicle_import_items')
        .update({
          processing_status: 'error',
          processed_at: new Date().toISOString(),
          validation_errors: ['apply_failed'],
        })
        .eq('id', raw.id)
    }
  }

  await getSupabase()
    .from('vehicle_import_batches')
    .update({
      status: errCount > 0 ? 'completed_with_errors' : 'completed',
      created_count: created,
      updated_count: updated,
      unchanged_count: unchanged,
      conflict_count: conflict,
      error_count: errCount,
      finished_at: new Date().toISOString(),
    })
    .eq('id', input.batchId)

  return { created, updated, unchanged, conflict, error: errCount }
}

export async function adminListVehicleImportBatches(limit = 40) {
  const { data, error } = await getSupabase()
    .from('vehicle_import_batches')
    .select(
      'id, source_id, file_name, status, total_records, created_count, updated_count, unchanged_count, conflict_count, error_count, ambiguous_count, started_at, finished_at, created_at, vehicle_data_sources(name)',
    )
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data ?? []
}
