import { getSupabase } from '@/lib/supabase'
import { normalizeCep } from '@/lib/cep'
import type { StoreShippingOrigin } from '@/types'

type Row = {
  id: string
  internal_name?: string | null
  sender_name?: string | null
  document?: string | null
  phone?: string | null
  is_active?: boolean | null
  postal_code: string
  street: string
  number: string
  complement: string | null
  district: string | null
  city: string
  state: string
}

function onlyDigits(v: string): string {
  return v.replace(/\D/g, '')
}

function map(row: Row): StoreShippingOrigin {
  return {
    id: String(row.id),
    internalName: row.internal_name ?? null,
    senderName: row.sender_name ?? null,
    document: row.document ?? null,
    phone: row.phone ?? null,
    isActive: row.is_active !== false,
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
  internalName: string
  senderName: string
  document: string
  phone: string
  postalCode: string
  street: string
  number: string
  complement?: string | null
  district?: string | null
  city: string
  state: string
}): Promise<StoreShippingOrigin> {
  const document = onlyDigits(input.document)
  const phone = onlyDigits(input.phone)
  if (!input.internalName.trim()) throw new Error('Informe o nome interno da origem.')
  if (!input.senderName.trim()) throw new Error('Informe o nome do remetente.')
  if (document.length !== 11 && document.length !== 14) {
    throw new Error('CPF/CNPJ do remetente inválido (11 ou 14 dígitos).')
  }
  if (phone.length < 10 || phone.length > 11) {
    throw new Error('Telefone do remetente inválido (DDD + número).')
  }

  const payload = {
    internal_name: input.internalName.trim(),
    sender_name: input.senderName.trim(),
    document,
    phone,
    is_active: true,
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
