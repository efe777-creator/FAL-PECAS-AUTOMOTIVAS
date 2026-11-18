import { getSupabase } from '@/lib/supabase'

/**
 * PLANO 2A E1 — base segura de transferência (sem wizard Etapa 4).
 * Fecha período do caller, abre período do destinatário, cria membership se preciso.
 */
export async function transferVehicleOwnershipBase(input: {
  vehicleIdentityId: string
  newCustomerId: string
  createMembership?: boolean
}): Promise<string> {
  const { data, error } = await getSupabase().rpc('transfer_vehicle_ownership_base', {
    p_vehicle_identity_id: input.vehicleIdentityId,
    p_new_customer_id: input.newCustomerId,
    p_create_membership: input.createMembership ?? true,
  })
  if (error) throw error
  if (!data) throw new Error('Transferência não retornou período.')
  return String(data)
}
