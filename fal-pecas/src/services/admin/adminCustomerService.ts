import { getSupabase } from '@/lib/supabase'

export interface AdminCustomerListRow {
  id: string
  name: string | null
  username: string | null
  phone: string | null
  document: string | null
  createdAt: string
  assignedPriceListId: string | null
}

export interface AdminCustomerDetail extends AdminCustomerListRow {
  addressCount: number
  assignedPriceListName: string | null
  recentOrders: { id: string; status: string; total: number; createdAt: string }[]
}

export type AdminAssignedPriceListOption = {
  id: string
  name: string
  slug: string
  status: string
}

export async function staffCanViewCustomersF8(): Promise<boolean> {
  const { data, error } = await getSupabase().rpc('staff_can_view_customers_f8')
  if (error) throw error
  return Boolean(data)
}

/** Tamanho padrão de página da lista de clientes. */
export const ADMIN_CUSTOMERS_PAGE_SIZE = 200

export async function adminListCustomers(opts?: {
  offset?: number
  limit?: number
}): Promise<AdminCustomerListRow[]> {
  const limit = opts?.limit ?? ADMIN_CUSTOMERS_PAGE_SIZE
  const offset = opts?.offset ?? 0
  const { data, error } = await getSupabase()
    .from('customers')
    .select('id, cpf, cnpj, created_at, assigned_price_list_id, profiles(full_name, username, phone)')
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .range(offset, offset + limit - 1)
  if (error) throw error

  return (data ?? []).map((c) => {
    const profile = Array.isArray(c.profiles) ? c.profiles[0] : c.profiles
    const doc = (c.cpf as string | null) || (c.cnpj as string | null)
    return {
      id: c.id as string,
      name: (profile?.full_name as string | null) ?? null,
      username: (profile?.username as string | null) ?? null,
      phone: (profile?.phone as string | null) ?? null,
      document: doc,
      createdAt: String(c.created_at),
      assignedPriceListId: (c.assigned_price_list_id as string | null) ?? null,
    }
  })
}

/** Listas B2B (scope=assigned) para vínculo no cliente. */
export async function adminListAssignedPriceLists(): Promise<AdminAssignedPriceListOption[]> {
  const { data, error } = await getSupabase()
    .from('price_lists')
    .select('id, name, slug, status')
    .eq('scope', 'assigned')
    .order('name', { ascending: true })
  if (error) throw error
  return (data ?? []).map((r) => ({
    id: String(r.id),
    name: String(r.name),
    slug: String(r.slug),
    status: String(r.status),
  }))
}

export async function adminSetCustomerAssignedPriceList(input: {
  customerId: string
  priceListId: string | null
}): Promise<void> {
  const { error } = await getSupabase()
    .from('customers')
    .update({ assigned_price_list_id: input.priceListId })
    .eq('id', input.customerId)
  if (error) throw error
}

export async function adminGetCustomer(id: string): Promise<AdminCustomerDetail | null> {
  const sb = getSupabase()
  const { data, error } = await sb
    .from('customers')
    .select(
      'id, cpf, cnpj, created_at, assigned_price_list_id, profiles(full_name, username, phone)',
    )
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  if (!data) return null

  const profile = Array.isArray(data.profiles) ? data.profiles[0] : data.profiles
  const doc = (data.cpf as string | null) || (data.cnpj as string | null)
  const assignedId = (data.assigned_price_list_id as string | null) ?? null

  const [{ data: orders, error: oErr }, { count: addressCount, error: aErr }, listRes] =
    await Promise.all([
      sb
        .from('orders')
        .select('id, status, total, created_at')
        .eq('customer_id', id)
        .order('created_at', { ascending: false })
        .limit(10),
      sb
        .from('customer_addresses')
        .select('id', { count: 'exact', head: true })
        .eq('customer_id', id),
      assignedId
        ? sb.from('price_lists').select('name').eq('id', assignedId).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ])
  if (oErr) throw oErr
  if (aErr) throw aErr
  if (listRes.error) throw listRes.error

  return {
    id: data.id as string,
    name: (profile?.full_name as string | null) ?? null,
    username: (profile?.username as string | null) ?? null,
    phone: (profile?.phone as string | null) ?? null,
    document: doc,
    createdAt: String(data.created_at),
    assignedPriceListId: assignedId,
    assignedPriceListName: listRes.data?.name ? String(listRes.data.name) : null,
    addressCount: addressCount ?? 0,
    recentOrders: (orders ?? []).map((o) => ({
      id: o.id as string,
      status: String(o.status),
      total: Number(o.total),
      createdAt: String(o.created_at),
    })),
  }
}
