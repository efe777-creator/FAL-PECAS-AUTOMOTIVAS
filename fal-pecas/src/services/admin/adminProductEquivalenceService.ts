import { getSupabase } from '@/lib/supabase'

export const EQUIVALENCE_EVIDENCE_DEFAULT = 'cadastro_interno_fal'

export type AdminEquivalenceRow = {
  equivalentProductId: string
  evidence: string
  active: boolean
  name: string
  sku: string
  commercialRef: string
  status: string
}

type EquivJoinRow = {
  equivalent_product_id: string
  evidence: string
  active: boolean
  products:
    | {
        id: string
        name: string
        sku: string
        commercial_ref: string | null
        status: string
      }
    | {
        id: string
        name: string
        sku: string
        commercial_ref: string | null
        status: string
      }[]
    | null
}

function mapRow(r: EquivJoinRow): AdminEquivalenceRow {
  const p = Array.isArray(r.products) ? r.products[0]! : r.products!
  return {
    equivalentProductId: r.equivalent_product_id,
    evidence: r.evidence || EQUIVALENCE_EVIDENCE_DEFAULT,
    active: r.active,
    name: p.name,
    sku: p.sku,
    commercialRef: p.commercial_ref ?? p.sku,
    status: p.status,
  }
}

/** Par ordenado estável (testável) — UI sempre lista a partir de product_id. */
export function equivalencePairIds(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a]
}

export async function adminListProductEquivalences(
  productId: string,
): Promise<AdminEquivalenceRow[]> {
  const { data, error } = await getSupabase()
    .from('product_equivalences')
    .select(
      `
      equivalent_product_id,
      evidence,
      active,
      products!equivalent_product_id (
        id, name, sku, commercial_ref, status
      )
    `,
    )
    .eq('product_id', productId)
    .eq('active', true)
    .order('created_at', { ascending: true })
  if (error) throw error
  return ((data ?? []) as EquivJoinRow[]).filter((r) => r.products).map(mapRow)
}

/** Vincular A↔B (duas linhas). Sem transitividade. */
export async function adminAddProductEquivalence(
  productId: string,
  equivalentProductId: string,
  evidence = EQUIVALENCE_EVIDENCE_DEFAULT,
): Promise<void> {
  if (!productId || !equivalentProductId) throw new Error('Produto inválido')
  if (productId === equivalentProductId) {
    throw new Error('Não é possível equivaler o produto a si mesmo')
  }

  const existing = await adminListProductEquivalences(productId)
  if (existing.some((r) => r.equivalentProductId === equivalentProductId)) {
    throw new Error('Este produto já está na lista de equivalentes')
  }

  const now = new Date().toISOString()
  const rows = [
    {
      product_id: productId,
      equivalent_product_id: equivalentProductId,
      evidence,
      active: true,
      updated_at: now,
    },
    {
      product_id: equivalentProductId,
      equivalent_product_id: productId,
      evidence,
      active: true,
      updated_at: now,
    },
  ]

  const { error } = await getSupabase()
    .from('product_equivalences')
    .upsert(rows, { onConflict: 'product_id,equivalent_product_id' })
  if (error) throw error
}

/** Remove A↔B (ambas as direções). */
export async function adminRemoveProductEquivalence(
  productId: string,
  equivalentProductId: string,
): Promise<void> {
  const db = getSupabase()
  const { error: e1 } = await db
    .from('product_equivalences')
    .delete()
    .eq('product_id', productId)
    .eq('equivalent_product_id', equivalentProductId)
  if (e1) throw e1
  const { error: e2 } = await db
    .from('product_equivalences')
    .delete()
    .eq('product_id', equivalentProductId)
    .eq('equivalent_product_id', productId)
  if (e2) throw e2
}
