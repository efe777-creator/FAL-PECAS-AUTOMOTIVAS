import { getSupabase } from '@/lib/supabase'

export type VehicleDataSource = {
  id: string
  name: string
  providerType: string
  description: string | null
  status: 'active' | 'inactive'
  createdAt: string
  updatedAt: string
}

type Row = {
  id: string
  name: string
  provider_type: string
  description: string | null
  status: string
  created_at: string
  updated_at: string
}

function map(row: Row): VehicleDataSource {
  return {
    id: row.id,
    name: row.name,
    providerType: row.provider_type,
    description: row.description,
    status: row.status as VehicleDataSource['status'],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function adminListVehicleDataSources(): Promise<VehicleDataSource[]> {
  const { data, error } = await getSupabase()
    .from('vehicle_data_sources')
    .select('id, name, provider_type, description, status, created_at, updated_at')
    .order('name')
  if (error) throw error
  return ((data ?? []) as Row[]).map(map)
}

export async function adminUpsertVehicleDataSource(input: {
  id?: string
  name: string
  providerType: string
  description?: string | null
  status?: 'active' | 'inactive'
}): Promise<VehicleDataSource> {
  const payload = {
    name: input.name.trim(),
    provider_type: input.providerType,
    description: input.description?.trim() || null,
    status: input.status ?? 'active',
    updated_at: new Date().toISOString(),
  }
  const q = getSupabase().from('vehicle_data_sources')
  const { data, error } = input.id
    ? await q.update(payload).eq('id', input.id).select('*').single()
    : await q.insert(payload).select('*').single()
  if (error) throw error
  return map(data as Row)
}

export async function adminLinkExternalIdentifier(input: {
  sourceId: string
  externalId: string
  externalName?: string | null
  externalParentId?: string | null
  manufacturerId?: string | null
  modelId?: string | null
  vehicleVersionId?: string | null
}): Promise<{ id: string }> {
  const filled =
    (input.manufacturerId ? 1 : 0) +
    (input.modelId ? 1 : 0) +
    (input.vehicleVersionId ? 1 : 0)
  if (filled !== 1) throw new Error('external_identifier_requires_exactly_one_entity')

  const { data, error } = await getSupabase()
    .from('vehicle_external_identifiers')
    .insert({
      source_id: input.sourceId,
      external_id: input.externalId.trim(),
      external_name: input.externalName ?? null,
      external_parent_id: input.externalParentId ?? null,
      manufacturer_id: input.manufacturerId ?? null,
      model_id: input.modelId ?? null,
      vehicle_version_id: input.vehicleVersionId ?? null,
    })
    .select('id')
    .single()
  if (error) {
    if ((error as { code?: string }).code === '23505') {
      throw new Error('external_identifier_conflict')
    }
    throw error
  }
  return { id: String((data as { id: string }).id) }
}

export async function adminInsertAttributeEvidence(input: {
  sourceId: string
  sourceRecordId?: string | null
  modelId?: string | null
  vehicleVersionId?: string | null
  attributeName: string
  attributeValue: string
  confidence?: string | null
  validationStatus?: 'received' | 'confirmed' | 'in_review' | 'rejected'
}): Promise<{ id: string }> {
  const filled = (input.modelId ? 1 : 0) + (input.vehicleVersionId ? 1 : 0)
  if (filled !== 1) throw new Error('evidence_requires_exactly_one_entity')
  const { data, error } = await getSupabase()
    .from('vehicle_attribute_evidence')
    .insert({
      source_id: input.sourceId,
      source_record_id: input.sourceRecordId ?? null,
      model_id: input.modelId ?? null,
      vehicle_version_id: input.vehicleVersionId ?? null,
      attribute_name: input.attributeName,
      attribute_value: input.attributeValue,
      confidence: input.confidence ?? null,
      validation_status: input.validationStatus ?? 'received',
    })
    .select('id')
    .single()
  if (error) throw error
  return { id: String((data as { id: string }).id) }
}
