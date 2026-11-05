import { HOME_BANNERS, type HomeBanner } from '@/data/homeBanners'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'

type BannerRow = {
  id: string
  title: string
  subtitle: string
  cta_label: string
  href: string
  image_src: string | null
  tone: HomeBanner['tone']
  sort_order: number
}

function mapBanner(row: BannerRow): HomeBanner {
  return {
    id: row.id,
    title: row.title,
    subtitle: row.subtitle ?? '',
    ctaLabel: row.cta_label || 'Ver catálogo',
    to: row.href || '/catalogo',
    imageSrc: row.image_src ?? undefined,
    tone: row.tone === 'steel' || row.tone === 'sand' ? row.tone : 'navy',
  }
}

/**
 * Banners ativos da Home.
 * Sucesso no DB → lista ativa (pode ser vazia se o admin desligar todas).
 * Fallback estático só sem Supabase / erro de rede.
 */
export async function listHomeBanners(): Promise<HomeBanner[]> {
  if (!isSupabaseConfigured || !supabase) return HOME_BANNERS
  try {
    const { data, error } = await supabase
      .from('store_home_banners')
      .select('id, title, subtitle, cta_label, href, image_src, tone, sort_order')
      .eq('active', true)
      .order('sort_order', { ascending: true })
    if (error) throw error
    return ((data ?? []) as BannerRow[]).map(mapBanner)
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
