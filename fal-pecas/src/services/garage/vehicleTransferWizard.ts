import { getSupabase } from '@/lib/supabase'

export type TransferRequest = {
  id: string
  vehicleIdentityId: string
  fromCustomerId: string
  toCustomerId: string
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'expired'
  consentShareHistory: boolean
  consentSharePrivateEvidence: boolean
  note: string | null
  expiresAt: string
  createdAt: string
  resolvedAt: string | null
}

type Row = {
  id: string
  vehicle_identity_id: string
  from_customer_id: string
  to_customer_id: string
  status: string
  consent_share_history: boolean
  consent_share_private_evidence: boolean
  note: string | null
  expires_at: string
  created_at: string
  resolved_at: string | null
}

function mapRow(row: Row): TransferRequest {
  return {
    id: String(row.id),
    vehicleIdentityId: String(row.vehicle_identity_id),
    fromCustomerId: String(row.from_customer_id),
    toCustomerId: String(row.to_customer_id),
    status: row.status as TransferRequest['status'],
    consentShareHistory: Boolean(row.consent_share_history),
    consentSharePrivateEvidence: Boolean(row.consent_share_private_evidence),
    note: row.note,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at,
  }
}

const SELECT =
  'id, vehicle_identity_id, from_customer_id, to_customer_id, status, consent_share_history, consent_share_private_evidence, note, expires_at, created_at, resolved_at'

export async function listTransferRequests(
  vehicleIdentityId: string,
): Promise<TransferRequest[]> {
  const { data, error } = await getSupabase()
    .from('vehicle_transfer_requests')
    .select(SELECT)
    .eq('vehicle_identity_id', vehicleIdentityId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return ((data ?? []) as Row[]).map(mapRow)
}

export async function listIncomingTransfers(): Promise<TransferRequest[]> {
  const { data, error } = await getSupabase()
    .from('vehicle_transfer_requests')
    .select(SELECT)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
  if (error) throw error
  return ((data ?? []) as Row[]).map(mapRow)
}

export async function requestVehicleTransfer(input: {
  vehicleIdentityId: string
  toCustomerId: string
  consentShareHistory?: boolean
  consentSharePrivateEvidence?: boolean
  note?: string | null
}): Promise<TransferRequest> {
  const { data, error } = await getSupabase().rpc('request_vehicle_transfer', {
    p_vehicle_identity_id: input.vehicleIdentityId,
    p_to_customer_id: input.toCustomerId,
    p_consent_share_history: Boolean(input.consentShareHistory),
    p_consent_share_private_evidence: Boolean(input.consentSharePrivateEvidence),
    p_note: input.note ?? null,
  })
  if (error) throw error
  return mapRow(data as Row)
}

export async function cancelVehicleTransfer(requestId: string): Promise<TransferRequest> {
  const { data, error } = await getSupabase().rpc('cancel_vehicle_transfer', {
    p_request_id: requestId,
  })
  if (error) throw error
  return mapRow(data as Row)
}

export async function rejectVehicleTransfer(requestId: string): Promise<TransferRequest> {
  const { data, error } = await getSupabase().rpc('reject_vehicle_transfer', {
    p_request_id: requestId,
  })
  if (error) throw error
  return mapRow(data as Row)
}

export async function acceptVehicleTransfer(requestId: string): Promise<string> {
  const { data, error } = await getSupabase().rpc('accept_vehicle_transfer', {
    p_request_id: requestId,
  })
  if (error) throw error
  if (!data) throw new Error('Aceite não retornou período')
  return String(data)
}
