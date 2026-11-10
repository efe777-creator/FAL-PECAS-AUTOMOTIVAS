import { getSupabase } from '@/lib/supabase'
import type { HomeBanner } from '@/data/homeBanners'
import {
  FEATURED_DISPLAY_LIMIT_MAX,
  FEATURED_DISPLAY_LIMIT_MIN,
  HOME_FEATURED_LIMIT_DEFAULT,
} from '@/lib/homeSections'

export type AdminHomeBanner = HomeBanner & {
  sortOrder: number
  active: boolean
  startsAt: string | null
  endsAt: string | null
}

export type AdminHomeSettings = {
  id: string
  featuredDisplayLimit: number
}

export type AdminFeaturedRow = {
  productId: string
  sortOrder: number
  active: boolean
  name: string
  sku: string
  commercialRef: string
  status: string
  available: boolean
  categoryName: string | null
}

type BannerRow = {
  id: string
  title: string
  subtitle: string
  cta_label: string
  href: string
  image_src: string | null
  image_src_mobile: string | null
  tone: string
  sort_order: number
  active: boolean
  starts_at: string | null
  ends_at: string | null
}

const BANNER_SELECT =
  'id, title, subtitle, cta_label, href, image_src, image_src_mobile, tone, sort_order, active, starts_at, ends_at'

function emptyToNullIso(value: string | null | undefined): string | null {
  const t = value?.trim()
  if (!t) return null
  const d = new Date(t)
  if (Number.isNaN(d.getTime())) throw new Error('Data de vigência inválida.')
  return d.toISOString()
}

function mapBanner(row: BannerRow): AdminHomeBanner {
  return {
    id: row.id,
    title: row.title,
    subtitle: row.subtitle ?? '',
    ctaLabel: row.cta_label || 'Ver catálogo',
    to: row.href || '/catalogo',
    imageSrc: row.image_src ?? undefined,
    imageSrcMobile: row.image_src_mobile ?? undefined,
    tone: row.tone === 'steel' || row.tone === 'sand' ? row.tone : 'navy',
    sortOrder: row.sort_order,
    active: row.active,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
  }
}

export async function adminListHomeBanners(): Promise<AdminHomeBanner[]> {
  const { data, error } = await getSupabase()
    .from('store_home_banners')
    .select(BANNER_SELECT)
    .order('sort_order', { ascending: true })
  if (error) throw error
  return ((data ?? []) as BannerRow[]).map(mapBanner)
}

export async function adminUpsertHomeBanner(
  input: Omit<AdminHomeBanner, 'id'> & { id?: string },
): Promise<AdminHomeBanner> {
  const startsAt = emptyToNullIso(input.startsAt)
  const endsAt = emptyToNullIso(input.endsAt)
  if (startsAt && endsAt && new Date(endsAt) < new Date(startsAt)) {
    throw new Error('O encerramento da campanha deve ser depois do início.')
  }
  const payload = {
    title: input.title.trim(),
    subtitle: input.subtitle.trim(),
    cta_label: input.ctaLabel.trim() || 'Ver catálogo',
    href: input.to.trim() || '/catalogo',
    image_src: input.imageSrc?.trim() || null,
    image_src_mobile: input.imageSrcMobile?.trim() || null,
    tone: input.tone,
    sort_order: input.sortOrder,
    active: input.active,
    starts_at: startsAt,
    ends_at: endsAt,
    updated_at: new Date().toISOString(),
  }
  if (!payload.title) throw new Error('Informe o título do banner.')

  if (input.id) {
    const { data, error } = await getSupabase()
      .from('store_home_banners')
      .update(payload)
      .eq('id', input.id)
      .select(BANNER_SELECT)
      .single()
    if (error) throw error
    return mapBanner(data as BannerRow)
  }

  const { data, error } = await getSupabase()
    .from('store_home_banners')
    .insert(payload)
    .select(BANNER_SELECT)
    .single()
  if (error) throw error
  return mapBanner(data as BannerRow)
}

export async function adminGetHomeSettings(): Promise<AdminHomeSettings> {
  const { data, error } = await getSupabase()
    .from('store_home_settings')
    .select('id, featured_display_limit')
    .limit(1)
    .maybeSingle()
  if (error) throw error
  if (!data) {
    return { id: '', featuredDisplayLimit: HOME_FEATURED_LIMIT_DEFAULT }
  }
  const row = data as { id: string; featured_display_limit: number }
  return {
    id: row.id,
    featuredDisplayLimit: Math.min(
      FEATURED_DISPLAY_LIMIT_MAX,
      Math.max(FEATURED_DISPLAY_LIMIT_MIN, Math.floor(Number(row.featured_display_limit) || HOME_FEATURED_LIMIT_DEFAULT)),
    ),
  }
}

export async function adminUpsertHomeSettings(
  input: Omit<AdminHomeSettings, 'id'> & { id?: string },
): Promise<AdminHomeSettings> {
  const limit = Math.min(
    FEATURED_DISPLAY_LIMIT_MAX,
    Math.max(FEATURED_DISPLAY_LIMIT_MIN, Math.floor(Number(input.featuredDisplayLimit) || HOME_FEATURED_LIMIT_DEFAULT)),
  )
  const payload = {
    featured_display_limit: limit,
    updated_at: new Date().toISOString(),
  }
  if (input.id) {
    const { data, error } = await getSupabase()
      .from('store_home_settings')
      .update(payload)
      .eq('id', input.id)
      .select('id, featured_display_limit')
      .single()
    if (error) throw error
    const row = data as { id: string; featured_display_limit: number }
    return { id: row.id, featuredDisplayLimit: row.featured_display_limit }
  }
  const { data, error } = await getSupabase()
    .from('store_home_settings')
    .insert(payload)
    .select('id, featured_display_limit')
    .single()
  if (error) throw error
  const row = data as { id: string; featured_display_limit: number }
  return { id: row.id, featuredDisplayLimit: row.featured_display_limit }
}

export async function adminDeleteHomeBanner(id: string): Promise<void> {
  const { error } = await getSupabase().from('store_home_banners').delete().eq('id', id)
  if (error) throw error
}

const BANNER_IMAGE_BUCKET = 'product-images'

/** Ideal na Home: faixa retangular do carrossel (~3:1). */
export const HOME_BANNER_IMAGE_IDEAL = {
  width: 1440,
  height: 480,
  label: '1440 × 480 px (retângulo 3:1)',
  hint: 'JPG, PNG ou WebP · horizontal · máx. ~2 MB',
} as const

/** Upload de arte da campanha → URL pública em product-images/home-banners/. */
export async function adminUploadHomeBannerImage(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Selecione um arquivo de imagem (PNG, JPG ou WebP).')
  }
  if (file.size > 2 * 1024 * 1024) {
    throw new Error('Imagem muito grande (máx. 2 MB).')
  }
  const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
  const safeExt = ['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext) ? ext : 'png'
  const path = `home-banners/${crypto.randomUUID()}.${safeExt}`
  const sb = getSupabase()
  const { error: upErr } = await sb.storage.from(BANNER_IMAGE_BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || undefined,
  })
  if (upErr) throw upErr
  const { data } = sb.storage.from(BANNER_IMAGE_BUCKET).getPublicUrl(path)
  if (!data.publicUrl) throw new Error('Não foi possível obter a URL da imagem.')
  return data.publicUrl
}

export async function adminListFeaturedProducts(): Promise<AdminFeaturedRow[]> {
  const { data, error } = await getSupabase()
    .from('store_home_featured_products')
    .select(
      'product_id, sort_order, active, products!inner(id, name, sku, commercial_ref, status, is_available, product_categories(name))',
    )
    .order('sort_order', { ascending: true })
  if (error) throw error
  return (data ?? []).map((row) => {
    const r = row as {
      product_id: string
      sort_order: number
      active: boolean
      products:
        | {
            id: string
            name: string
            sku: string
            commercial_ref: string | null
            status: string
            is_available: boolean | null
            product_categories: { name: string } | { name: string }[] | null
          }
        | {
            id: string
            name: string
            sku: string
            commercial_ref: string | null
            status: string
            is_available: boolean | null
            product_categories: { name: string } | { name: string }[] | null
          }[]
    }
    const p = Array.isArray(r.products) ? r.products[0]! : r.products
    const cat = p.product_categories
    const catName = Array.isArray(cat) ? cat[0]?.name ?? null : cat?.name ?? null
    return {
      productId: r.product_id,
      sortOrder: r.sort_order,
      active: r.active,
      name: p.name,
      sku: p.sku,
      commercialRef: p.commercial_ref ?? p.sku,
      status: p.status,
      available: p.is_available !== false,
      categoryName: catName,
    }
  })
}

export async function adminAddFeaturedProduct(productId: string, sortOrder = 0): Promise<void> {
  const { error } = await getSupabase().from('store_home_featured_products').upsert(
    {
      product_id: productId,
      sort_order: sortOrder,
      active: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'product_id' },
  )
  if (error) throw error
}

export async function adminUpdateFeaturedProduct(
  productId: string,
  patch: { sortOrder?: number; active?: boolean },
): Promise<void> {
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (patch.sortOrder != null) payload.sort_order = patch.sortOrder
  if (patch.active != null) payload.active = patch.active
  const { error } = await getSupabase()
    .from('store_home_featured_products')
    .update(payload)
    .eq('product_id', productId)
  if (error) throw error
}

export async function adminRemoveFeaturedProduct(productId: string): Promise<void> {
  const { error } = await getSupabase()
    .from('store_home_featured_products')
    .delete()
    .eq('product_id', productId)
  if (error) throw error
}

/** Troca sort_order entre dois banners (↑/↓ na lista). */
export async function adminSwapBannerOrder(a: AdminHomeBanner, b: AdminHomeBanner): Promise<void> {
  const db = getSupabase()
  const now = new Date().toISOString()
  const { error: e1 } = await db
    .from('store_home_banners')
    .update({ sort_order: b.sortOrder, updated_at: now })
    .eq('id', a.id)
  if (e1) throw e1
  const { error: e2 } = await db
    .from('store_home_banners')
    .update({ sort_order: a.sortOrder, updated_at: now })
    .eq('id', b.id)
  if (e2) throw e2
}

/** Troca sort_order entre dois destaques (↑/↓ na lista). */
export async function adminSwapFeaturedOrder(
  a: AdminFeaturedRow,
  b: AdminFeaturedRow,
): Promise<void> {
  const db = getSupabase()
  const now = new Date().toISOString()
  const { error: e1 } = await db
    .from('store_home_featured_products')
    .update({ sort_order: b.sortOrder, updated_at: now })
    .eq('product_id', a.productId)
  if (e1) throw e1
  const { error: e2 } = await db
    .from('store_home_featured_products')
    .update({ sort_order: a.sortOrder, updated_at: now })
    .eq('product_id', b.productId)
  if (e2) throw e2
}
