import { getSupabase } from '@/lib/supabase'
import { normalizeCep } from '@/lib/cep'
import type { StoreShippingOrigin } from '@/types'

type Row = {
  id: string
  postal_code: string
  street: string
  number: string
  complement: string | null
  district: string | null
  city: string
  state: string
}

function map(row: Row): StoreShippingOrigin {
  return {
    id: String(row.id),
    postalCode: row.postal_code,
    street: row.street,
    number: row.number,
    complement: row.complement,
    district: row.district,
    city: row.city,
    state: row.state,
  }
}

export async function getStoreShippingOrigin(): Promise<StoreShippingOrigin | null> {
  const { data, error } = await getSupabase()
    .from('store_shipping_origin')
    .select('*')
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data ? map(data as Row) : null
}

export async function upsertStoreShippingOrigin(input: {
  id?: string
  postalCode: string
  street: string
  number: string
  complement?: string | null
  district?: string | null
  city: string
  state: string
}): Promise<StoreShippingOrigin> {
  const payload = {
    postal_code: normalizeCep(input.postalCode),
    street: input.street.trim(),
    number: input.number.trim(),
    complement: input.complement?.trim() || null,
    district: input.district?.trim() || null,
    city: input.city.trim(),
    state: input.state.trim().toUpperCase().slice(0, 2),
    updated_at: new Date().toISOString(),
  }
  if (payload.postal_code.length !== 8) throw new Error('CEP de origem inválido')

  const existing = input.id ? { id: input.id } : await getStoreShippingOrigin()
  const q = getSupabase().from('store_shipping_origin')
  const { data, error } = existing?.id
    ? await q.update(payload).eq('id', existing.id).select().single()
    : await q.insert(payload).select().single()
  if (error) throw error
  return map(data as Row)
}
