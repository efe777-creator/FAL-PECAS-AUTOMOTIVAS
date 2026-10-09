import { formatCatalogDisplayName, normalizeEntityMatchKey } from '@/lib/entityNormalize'
import { getSupabase } from '@/lib/supabase'
import { toSlug } from '@/lib/slug'
import type { Manufacturer } from '@/types'

type Row = { id: string; name: string; slug: string; status: string }

function map(row: Row): Manufacturer {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    status: row.status as Manufacturer['status'],
  }
}

export async function adminListManufacturers(): Promise<Manufacturer[]> {
  const { data, error } = await getSupabase()
    .from('manufacturers')
    .select('id, name, slug, status')
    .order('name')
  if (error) throw error
  return (data as Row[]).map(map)
}

export async function adminUpsertManufacturer(input: {
  id?: string
  name: string
  slug?: string
  status?: Manufacturer['status']
}): Promise<Manufacturer> {
  const name = formatCatalogDisplayName(input.name)
  if (!name) throw new Error('Informe o nome da montadora.')

  if (!input.id) {
    const existing = await adminListManufacturers()
    const dup = existing.find(
      (m) =>
        m.status === 'active' &&
        normalizeEntityMatchKey(m.name) === normalizeEntityMatchKey(name),
    )
    if (dup) throw new Error(`Já existe montadora "${dup.name}".`)
  }

  const payload = {
    name,
    slug: (input.slug?.trim() || toSlug(name)) || toSlug(`mfr-${Date.now()}`),
    status: input.status ?? 'active',
  }
  const q = getSupabase().from('manufacturers')
  const { data, error } = input.id
    ? await q.update(payload).eq('id', input.id).select().single()
    : await q.insert(payload).select().single()
  if (error) throw error
  return map(data as Row)
}

export async function adminSetManufacturerStatus(
  id: string,
  status: Manufacturer['status'],
): Promise<void> {
  const { error } = await getSupabase().from('manufacturers').update({ status }).eq('id', id)
  if (error) throw error
}
