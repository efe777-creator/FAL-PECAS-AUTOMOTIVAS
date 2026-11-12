import { getSupabase } from '@/lib/supabase'
import type { HomeBanner } from '@/data/homeBanners'
import {
  FEATURED_DISPLAY_LIMIT_MAX,
  FEATURED_DISPLAY_LIMIT_MIN,
  HOME_FEATURED_LIMIT_DEFAULT,
} from '@/lib/homeSections'
import { invalidateHomePresentationCache } from '@/services/home/homeContentService'

export type AdminHomeBanner = HomeBanner & {
  sortOrder: number
  active: boolean
  startsAt: string | null
  endsAt: string | null
}

export type AdminHomeSettings = {
  id: string
  featuredDisplayLimit: number
  /** HOME-07 — só apresentação; não altera resolve. */
  showOfertaBadge: boolean
  showDiscountPercent: boolean
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
  /** HOME-02 */
  imageUrl: string | null
  listPrice: number | null
  resolvedPrice: number | null
  promoActive: boolean
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

const HOME_SETTINGS_SELECT =
  'id, featured_display_limit, show_oferta_badge, show_discount_percent'

function mapHomeSettings(row: {
  id: string
  featured_display_limit: number
  show_oferta_badge?: boolean | null
  show_discount_percent?: boolean | null
}): AdminHomeSettings {
  return {
    id: row.id,
    featuredDisplayLimit: Math.min(
      FEATURED_DISPLAY_LIMIT_MAX,
      Math.max(
        FEATURED_DISPLAY_LIMIT_MIN,
        Math.floor(Number(row.featured_display_limit) || HOME_FEATURED_LIMIT_DEFAULT),
      ),
    ),
    showOfertaBadge: row.show_oferta_badge !== false,
    showDiscountPercent: row.show_discount_percent !== false,
  }
}

export async function adminGetHomeSettings(): Promise<AdminHomeSettings> {
  const { data, error } = await getSupabase()
    .from('store_home_settings')
    .select(HOME_SETTINGS_SELECT)
    .limit(1)
    .maybeSingle()
  if (error) throw error
  if (!data) {
    return {
      id: '',
      featuredDisplayLimit: HOME_FEATURED_LIMIT_DEFAULT,
      showOfertaBadge: true,
      showDiscountPercent: true,
    }
  }
  return mapHomeSettings(
    data as {
      id: string
      featured_display_limit: number
      show_oferta_badge?: boolean | null
      show_discount_percent?: boolean | null
    },
  )
}

export async function adminUpsertHomeSettings(
  input: Omit<AdminHomeSettings, 'id'> & { id?: string },
): Promise<AdminHomeSettings> {
  const limit = Math.min(
    FEATURED_DISPLAY_LIMIT_MAX,
    Math.max(FEATURED_DISPLAY_LIMIT_MIN, Math.floor(Number(input.featuredDisplayLimit) || HOME_FEATURED_LIMIT_DEFAULT)),
  )
  const showBadge = input.showOfertaBadge !== false
  const payload = {
    featured_display_limit: limit,
    show_oferta_badge: showBadge,
    /** % só faz sentido com selo ligado. */
    show_discount_percent: showBadge && input.showDiscountPercent !== false,
    updated_at: new Date().toISOString(),
  }
  if (input.id) {
    const { data, error } = await getSupabase()
      .from('store_home_settings')
      .update(payload)
      .eq('id', input.id)
      .select(HOME_SETTINGS_SELECT)
      .single()
    if (error) throw error
    invalidateHomePresentationCache()
    return mapHomeSettings(
      data as {
        id: string
        featured_display_limit: number
        show_oferta_badge?: boolean | null
        show_discount_percent?: boolean | null
      },
    )
  }
  const { data, error } = await getSupabase()
    .from('store_home_settings')
    .insert(payload)
    .select(HOME_SETTINGS_SELECT)
    .single()
  if (error) throw error
  invalidateHomePresentationCache()
  return mapHomeSettings(
    data as {
      id: string
      featured_display_limit: number
      show_oferta_badge?: boolean | null
      show_discount_percent?: boolean | null
    },
  )
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

const BASE_LIST_ID = 'a1111111-1111-1111-1111-111111111101'

export async function adminListFeaturedProducts(): Promise<AdminFeaturedRow[]> {
  const sb = getSupabase()
  const { data, error } = await sb
    .from('store_home_featured_products')
    .select(
      'product_id, sort_order, active, products!inner(id, name, sku, commercial_ref, status, is_available, product_categories(name))',
    )
    .order('sort_order', { ascending: true })
  if (error) throw error

  const baseRows = (data ?? []).map((row) => {
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
      imageUrl: null as string | null,
      listPrice: null as number | null,
      resolvedPrice: null as number | null,
      promoActive: false,
    }
  })

  if (!baseRows.length) return baseRows

  const ids = baseRows.map((r) => r.productId)

  const [{ data: imgs }, { data: baseItems }, { data: promos }, resolved] = await Promise.all([
    sb
      .from('product_images')
      .select('product_id, storage_path, is_primary, sort_order')
      .in('product_id', ids)
      .order('sort_order', { ascending: true }),
    sb
      .from('price_list_items')
      .select('product_id, price')
      .eq('price_list_id', BASE_LIST_ID)
      .in('product_id', ids),
    sb
      .from('product_promotions')
      .select('product_id, starts_at, ends_at')
      .eq('status', 'active')
      .in('product_id', ids),
    sb.rpc('resolve_product_prices', {
      p_product_ids: ids,
      p_customer_id: null,
      p_at: new Date().toISOString(),
    }),
  ])

  const imgMap = new Map<string, string>()
  for (const img of imgs ?? []) {
    const row = img as {
      product_id: string
      storage_path: string
      is_primary?: boolean
    }
    const pid = String(row.product_id)
    const { data: pub } = sb.storage.from('product-images').getPublicUrl(row.storage_path)
    const url = pub.publicUrl
    if (!url) continue
    if (row.is_primary || !imgMap.has(pid)) imgMap.set(pid, url)
  }

  const baseMap = new Map(
    (baseItems ?? []).map((r) => [String(r.product_id), Number(r.price)]),
  )
  const now = Date.now()
  const promoSet = new Set(
    (promos ?? [])
      .filter((r) => {
        const row = r as { starts_at?: string | null; ends_at?: string | null }
        if (row.starts_at && new Date(row.starts_at).getTime() > now) return false
        if (row.ends_at && new Date(row.ends_at).getTime() < now) return false
        return true
      })
      .map((r) => String((r as { product_id: string }).product_id)),
  )
  const resolvedMap = new Map<string, number>()
  for (const row of (resolved.data ?? []) as Array<{ product_id: string; amount: number | string }>) {
    resolvedMap.set(String(row.product_id), Number(row.amount))
  }

  return baseRows.map((r) => ({
    ...r,
    imageUrl: imgMap.get(r.productId) ?? null,
    listPrice: baseMap.get(r.productId) ?? null,
    resolvedPrice: resolvedMap.get(r.productId) ?? null,
    promoActive: promoSet.has(r.productId),
  }))
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
