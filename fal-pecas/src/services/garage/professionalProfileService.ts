import { getSupabase } from '@/lib/supabase'
import { getCurrentCustomerId } from '@/services/customers/customerService'
import type { ProfessionalTrustLevel } from '@/services/garage/professionalTrust'

export type ProfessionalProfile = {
  id: string
  displayName: string
  falCode: string
  description: string | null
  region: string | null
  contactPhone: string | null
  contactEmail: string | null
  trustLevel: ProfessionalTrustLevel
  verificationState: string
  specialtyIds: string[]
  createdByCustomerId: string | null
}

type ProfileDb = {
  id: string
  display_name: string
  fal_code: string
  description: string | null
  region: string | null
  contact_phone: string | null
  contact_email: string | null
  trust_level: number
  verification_state: string
  created_by_customer_id: string | null
}

function mapProfile(row: ProfileDb, specialtyIds: string[] = []): ProfessionalProfile {
  return {
    id: String(row.id),
    displayName: row.display_name,
    falCode: row.fal_code,
    description: row.description,
    region: row.region,
    contactPhone: row.contact_phone,
    contactEmail: row.contact_email,
    trustLevel: row.trust_level as ProfessionalTrustLevel,
    verificationState: row.verification_state,
    specialtyIds,
    createdByCustomerId: row.created_by_customer_id
      ? String(row.created_by_customer_id)
      : null,
  }
}

async function loadSpecialtyMap(
  professionalIds: string[],
): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>()
  if (!professionalIds.length) return map
  const { data, error } = await getSupabase()
    .from('professional_profile_specialties')
    .select('professional_id, specialty_id')
    .in('professional_id', professionalIds)
  if (error) throw error
  for (const row of (data ?? []) as Array<{ professional_id: string; specialty_id: string }>) {
    const id = String(row.professional_id)
    const list = map.get(id) ?? []
    list.push(row.specialty_id)
    map.set(id, list)
  }
  return map
}

export async function listMyProfessionalProfiles(): Promise<ProfessionalProfile[]> {
  const customerId = await getCurrentCustomerId()
  if (!customerId) return []
  const { data, error } = await getSupabase()
    .from('professional_profiles')
    .select(
      'id, display_name, fal_code, description, region, contact_phone, contact_email, trust_level, verification_state, created_by_customer_id',
    )
    .eq('created_by_customer_id', customerId)
    .order('display_name')
  if (error) throw error
  const rows = (data ?? []) as ProfileDb[]
  const specs = await loadSpecialtyMap(rows.map((r) => String(r.id)))
  return rows.map((r) => mapProfile(r, specs.get(String(r.id)) ?? []))
}

/** Profissionais vinculados a eventos desta identity (sem acesso auto à garagem). */
export async function listProfessionalsForIdentity(
  vehicleIdentityId: string,
): Promise<ProfessionalProfile[]> {
  const { data: maint, error: mErr } = await getSupabase()
    .from('vehicle_maintenances')
    .select('professional_id')
    .eq('vehicle_identity_id', vehicleIdentityId)
    .not('professional_id', 'is', null)
  if (mErr) throw mErr

  const { data: events, error: eErr } = await getSupabase()
    .from('vehicle_events')
    .select('id')
    .eq('vehicle_identity_id', vehicleIdentityId)
  if (eErr) throw eErr
  const eventIds = ((events ?? []) as { id: string }[]).map((e) => String(e.id))

  let linkIds: string[] = []
  if (eventIds.length) {
    const { data: links, error: lErr } = await getSupabase()
      .from('vehicle_event_professionals')
      .select('professional_id')
      .in('event_id', eventIds)
    if (lErr) throw lErr
    linkIds = ((links ?? []) as { professional_id: string }[]).map((l) =>
      String(l.professional_id),
    )
  }

  const ids = [
    ...new Set([
      ...((maint ?? []) as { professional_id: string | null }[])
        .map((m) => (m.professional_id ? String(m.professional_id) : null))
        .filter((x): x is string => Boolean(x)),
      ...linkIds,
    ]),
  ]
  if (!ids.length) return []

  const { data, error } = await getSupabase()
    .from('professional_profiles')
    .select(
      'id, display_name, fal_code, description, region, contact_phone, contact_email, trust_level, verification_state, created_by_customer_id',
    )
    .in('id', ids)
    .order('display_name')
  if (error) throw error
  const rows = (data ?? []) as ProfileDb[]
  const specs = await loadSpecialtyMap(rows.map((r) => String(r.id)))
  return rows.map((r) => mapProfile(r, specs.get(String(r.id)) ?? []))
}

export async function createProfessionalProfile(input: {
  displayName: string
  description?: string | null
  region?: string | null
  contactPhone?: string | null
  contactEmail?: string | null
  specialtyIds?: string[]
}): Promise<ProfessionalProfile> {
  const { data, error } = await getSupabase().rpc('create_professional_profile', {
    p_display_name: input.displayName,
    p_description: input.description ?? null,
    p_region: input.region ?? null,
    p_contact_phone: input.contactPhone ?? null,
    p_contact_email: input.contactEmail ?? null,
    p_specialty_ids: input.specialtyIds ?? [],
  })
  if (error) throw error
  return mapProfile(data as ProfileDb, input.specialtyIds ?? [])
}

export async function listSpecialtyCatalog(): Promise<Array<{ id: string; label: string }>> {
  const { data, error } = await getSupabase()
    .from('professional_specialties')
    .select('id, label, sort_order')
    .order('sort_order')
  if (error) throw error
  return ((data ?? []) as Array<{ id: string; label: string }>).map((r) => ({
    id: r.id,
    label: r.label,
  }))
}
