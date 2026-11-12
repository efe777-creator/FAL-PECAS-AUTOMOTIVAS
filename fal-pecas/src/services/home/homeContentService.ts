import { HOME_BANNERS, type HomeBanner } from '@/data/homeBanners'
import { HOME_FEATURED_LIMIT_DEFAULT } from '@/lib/homeSections'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'

type BannerRow = {
  id: string
  title: string
  subtitle: string
  cta_label: string
  href: string
  image_src: string | null
  image_src_mobile: string | null
  tone: HomeBanner['tone']
  sort_order: number
  starts_at: string | null
  ends_at: string | null
}

function mapBanner(row: BannerRow): HomeBanner {
  return {
    id: row.id,
    title: row.title,
    subtitle: row.subtitle ?? '',
    ctaLabel: row.cta_label || 'Ver catálogo',
    to: row.href || '/catalogo',
    imageSrc: row.image_src ?? undefined,
    imageSrcMobile: row.image_src_mobile ?? undefined,
    tone: row.tone === 'steel' || row.tone === 'sand' ? row.tone : 'navy',
  }
}

/** Filtra vigência no cliente (defesa extra além da RLS). */
export function isBannerWithinSchedule(
  startsAt: string | null | undefined,
  endsAt: string | null | undefined,
  now = new Date(),
): boolean {
  if (startsAt) {
    const start = new Date(startsAt)
    if (!Number.isNaN(start.getTime()) && start > now) return false
  }
  if (endsAt) {
    const end = new Date(endsAt)
    if (!Number.isNaN(end.getTime()) && end < now) return false
  }
  return true
}

/**
 * Banners ativos da Home (respeitam active + vigência).
 * Sucesso no DB → lista ativa (pode ser vazia se o admin desligar todas).
 * Fallback estático só sem Supabase / erro de rede.
 */
export async function listHomeBanners(): Promise<HomeBanner[]> {
  if (!isSupabaseConfigured || !supabase) return HOME_BANNERS
  try {
    const { data, error } = await supabase
      .from('store_home_banners')
      .select(
        'id, title, subtitle, cta_label, href, image_src, image_src_mobile, tone, sort_order, starts_at, ends_at',
      )
      .eq('active', true)
      .order('sort_order', { ascending: true })
    if (error) throw error
    const now = new Date()
    return ((data ?? []) as BannerRow[])
      .filter((row) => isBannerWithinSchedule(row.starts_at, row.ends_at, now))
      .map(mapBanner)
  } catch {
    return HOME_BANNERS
  }
}

/** IDs curados de destaques (ordenados). Vazio = loja usa heurística. */
export async function listCuratedFeaturedProductIds(): Promise<string[]> {
  if (!isSupabaseConfigured || !supabase) return []
  try {
    const { data, error } = await supabase
      .from('store_home_featured_products')
      .select('product_id, sort_order')
      .eq('active', true)
      .order('sort_order', { ascending: true })
    if (error) throw error
    return (data ?? []).map((r) => String((r as { product_id: string }).product_id))
  } catch {
    return []
  }
}

export type HomePresentationSettings = {
  featuredDisplayLimit: number
  showOfertaBadge: boolean
  showDiscountPercent: boolean
}

const HOME_PRESENTATION_DEFAULT: HomePresentationSettings = {
  featuredDisplayLimit: HOME_FEATURED_LIMIT_DEFAULT,
  showOfertaBadge: true,
  showDiscountPercent: true,
}

/** Settings de apresentação da Home/vitrine (cache leve em memória). */
let homePresentationCache: { at: number; value: HomePresentationSettings } | null = null
const HOME_PRESENTATION_TTL_MS = 5 * 60 * 1000

/** Invalida após admin salvar Config (selo/% / limite). */
export function invalidateHomePresentationCache() {
  homePresentationCache = null
}

export async function getHomePresentationSettings(): Promise<HomePresentationSettings> {
  if (!isSupabaseConfigured || !supabase) return HOME_PRESENTATION_DEFAULT
  const now = Date.now()
  if (homePresentationCache && now - homePresentationCache.at < HOME_PRESENTATION_TTL_MS) {
    return homePresentationCache.value
  }
  try {
    const { data, error } = await supabase
      .from('store_home_settings')
      .select('featured_display_limit, show_oferta_badge, show_discount_percent')
      .limit(1)
      .maybeSingle()
    if (error) throw error
    const row = data as {
      featured_display_limit?: number
      show_oferta_badge?: boolean | null
      show_discount_percent?: boolean | null
    } | null
    const n = Number(row?.featured_display_limit)
    const value: HomePresentationSettings = {
      featuredDisplayLimit: Number.isFinite(n)
        ? Math.min(48, Math.max(1, Math.floor(n)))
        : HOME_FEATURED_LIMIT_DEFAULT,
      showOfertaBadge: row?.show_oferta_badge !== false,
      showDiscountPercent: row?.show_discount_percent !== false,
    }
    homePresentationCache = { at: now, value }
    return value
  } catch {
    return HOME_PRESENTATION_DEFAULT
  }
}

/** Quantidade de destaques na Home (admin). Fallback = constante. */
export async function getFeaturedDisplayLimit(): Promise<number> {
  const s = await getHomePresentationSettings()
  return s.featuredDisplayLimit
}
