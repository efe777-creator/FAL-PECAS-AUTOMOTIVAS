/** Montagem de sitemap.xml (Onda 2) — puro, sem I/O. */

export type SitemapUrlEntry = {
  loc: string
  lastmod?: string
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
  priority?: number
}

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export function productSitemapLoc(siteOrigin: string, slug: string): string {
  const base = siteOrigin.replace(/\/$/, '')
  return `${base}/produto/${encodeURIComponent(slug.trim())}`
}

export function buildSitemapXml(entries: SitemapUrlEntry[]): string {
  const body = entries
    .map((e) => {
      const lines = [`    <loc>${escapeXml(e.loc)}</loc>`]
      if (e.lastmod) lines.push(`    <lastmod>${escapeXml(e.lastmod)}</lastmod>`)
      if (e.changefreq) lines.push(`    <changefreq>${e.changefreq}</changefreq>`)
      if (e.priority != null) lines.push(`    <priority>${e.priority.toFixed(1)}</priority>`)
      return `  <url>\n${lines.join('\n')}\n  </url>`
    })
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`
}

export function buildStoreSitemapEntries(opts: {
  siteOrigin: string
  products: Array<{ slug: string; updatedAt?: string | null }>
}): SitemapUrlEntry[] {
  const origin = opts.siteOrigin.replace(/\/$/, '')
  const staticPages: SitemapUrlEntry[] = [
    { loc: `${origin}/`, changefreq: 'daily', priority: 1 },
    { loc: `${origin}/catalogo`, changefreq: 'daily', priority: 0.9 },
    { loc: `${origin}/veiculo`, changefreq: 'weekly', priority: 0.7 },
    { loc: `${origin}/termos`, changefreq: 'yearly', priority: 0.3 },
    { loc: `${origin}/privacidade`, changefreq: 'yearly', priority: 0.3 },
  ]

  const seen = new Set<string>()
  const productEntries: SitemapUrlEntry[] = []
  for (const p of opts.products) {
    const slug = p.slug?.trim()
    if (!slug || seen.has(slug)) continue
    seen.add(slug)
    const lastmod = p.updatedAt?.slice(0, 10) || undefined
    productEntries.push({
      loc: productSitemapLoc(origin, slug),
      lastmod,
      changefreq: 'weekly',
      priority: 0.8,
    })
  }

  return [...staticPages, ...productEntries]
}
