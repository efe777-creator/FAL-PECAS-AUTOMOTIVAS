import { getSupabase } from '@/lib/supabase'
import { getCurrentCustomerId } from '@/services/customers/customerService'
import {
  EVIDENCE_TYPES,
  VEHICLE_EVIDENCE_BUCKET,
  VEHICLE_EVIDENCE_SIGNED_TTL_SEC,
  type EvidenceType,
  type EvidenceVisibility,
} from '@/services/garage/evidenceTypes'

export type VehicleEvidence = {
  id: string
  vehicleIdentityId: string
  evidenceType: EvidenceType
  title: string
  storagePath: string
  mime: string | null
  byteSize: number | null
  visibility: EvidenceVisibility
  createdAt: string
  signedUrl?: string | null
}

type Row = {
  id: string
  vehicle_identity_id: string
  evidence_type: string
  title: string
  storage_path: string
  mime: string | null
  byte_size: number | null
  visibility: string
  created_at: string
}

function mapRow(row: Row, signedUrl?: string | null): VehicleEvidence {
  return {
    id: String(row.id),
    vehicleIdentityId: String(row.vehicle_identity_id),
    evidenceType: row.evidence_type as EvidenceType,
    title: row.title,
    storagePath: row.storage_path,
    mime: row.mime,
    byteSize: row.byte_size,
    visibility: row.visibility as EvidenceVisibility,
    createdAt: row.created_at,
    signedUrl: signedUrl ?? null,
  }
}

async function signPaths(paths: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  if (!paths.length) return map
  const { data, error } = await getSupabase()
    .storage.from(VEHICLE_EVIDENCE_BUCKET)
    .createSignedUrls(paths, VEHICLE_EVIDENCE_SIGNED_TTL_SEC)
  if (error) throw error
  for (const item of data ?? []) {
    if (item.path && item.signedUrl) map.set(item.path, item.signedUrl)
  }
  return map
}

export async function listVehicleEvidence(
  vehicleIdentityId: string,
): Promise<VehicleEvidence[]> {
  const { data, error } = await getSupabase()
    .from('vehicle_evidence')
    .select(
      'id, vehicle_identity_id, evidence_type, title, storage_path, mime, byte_size, visibility, created_at',
    )
    .eq('vehicle_identity_id', vehicleIdentityId)
    .order('created_at', { ascending: false })
  if (error) throw error
  const rows = (data ?? []) as Row[]
  const signed = await signPaths(rows.map((r) => r.storage_path))
  return rows.map((r) => mapRow(r, signed.get(r.storage_path) ?? null))
}

export async function uploadVehicleEvidence(input: {
  vehicleIdentityId: string
  file: File
  title: string
  evidenceType: EvidenceType
  visibility?: EvidenceVisibility
}): Promise<VehicleEvidence> {
  const customerId = await getCurrentCustomerId()
  if (!customerId) throw new Error('Cliente não encontrado')
  if (!EVIDENCE_TYPES.includes(input.evidenceType)) {
    throw new Error('Tipo de evidência inválido')
  }
  const title = input.title.trim()
  if (!title) throw new Error('Informe um título')

  const evidenceId = crypto.randomUUID()
  const mime = (input.file.type || 'application/octet-stream').toLowerCase()
  const ext =
    mime === 'application/pdf'
      ? 'pdf'
      : mime.includes('png')
        ? 'png'
        : mime.includes('webp')
          ? 'webp'
          : mime.includes('mp4')
            ? 'mp4'
            : mime.includes('webm')
              ? 'webm'
              : 'jpg'
  const path = `${customerId}/${input.vehicleIdentityId}/${evidenceId}.${ext}`
  const sb = getSupabase()

  const { error: upErr } = await sb.storage.from(VEHICLE_EVIDENCE_BUCKET).upload(path, input.file, {
    cacheControl: '3600',
    upsert: false,
    contentType: mime,
  })
  if (upErr) throw upErr

  const { data: period } = await sb
    .from('vehicle_ownership_periods')
    .select('id')
    .eq('vehicle_identity_id', input.vehicleIdentityId)
    .eq('customer_id', customerId)
    .is('ended_at', null)
    .maybeSingle()

  const { data, error } = await sb
    .from('vehicle_evidence')
    .insert({
      id: evidenceId,
      vehicle_identity_id: input.vehicleIdentityId,
      ownership_period_id: (period as { id: string } | null)?.id ?? null,
      evidence_type: input.evidenceType,
      title,
      storage_path: path,
      mime,
      byte_size: input.file.size,
      visibility: input.visibility ?? 'private_owner',
      uploaded_by_customer_id: customerId,
    })
    .select(
      'id, vehicle_identity_id, evidence_type, title, storage_path, mime, byte_size, visibility, created_at',
    )
    .single()

  if (error) {
    await sb.storage.from(VEHICLE_EVIDENCE_BUCKET).remove([path])
    throw error
  }

  await sb.rpc('log_vehicle_access', {
    p_vehicle_identity_id: input.vehicleIdentityId,
    p_action: 'evidence_upload',
    p_resource_type: 'vehicle_evidence',
    p_resource_id: evidenceId,
    p_meta: {},
  })

  const signed = await signPaths([path])
  return mapRow(data as Row, signed.get(path) ?? null)
}

export async function linkEvidenceToEvent(input: {
  eventId: string
  evidenceId: string
}): Promise<void> {
  const customerId = await getCurrentCustomerId()
  if (!customerId) throw new Error('Cliente não encontrado')
  const { error } = await getSupabase().from('vehicle_event_evidence').insert({
    event_id: input.eventId,
    evidence_id: input.evidenceId,
    linked_by_customer_id: customerId,
  })
  if (error) throw error
}

/** Remove só o vínculo N:N — não apaga o arquivo. */
export async function unlinkEvidenceFromEvent(input: {
  eventId: string
  evidenceId: string
}): Promise<void> {
  const { error } = await getSupabase()
    .from('vehicle_event_evidence')
    .delete()
    .eq('event_id', input.eventId)
    .eq('evidence_id', input.evidenceId)
  if (error) throw error
}
