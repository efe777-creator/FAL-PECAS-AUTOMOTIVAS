/**
 * Gera public/sitemap.xml com rotas estáticas + /produto/:slug published.
 * 1) VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY (Netlify / .env)
 * 2) Fallback: `supabase db query --remote` (dev local ligado ao wtbp)
 * Sem fonte: só páginas estáticas (não falha o build).
 */
import { readFileSync, writeFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const outPath = join(root, 'public', 'sitemap.xml')

const SITE_ORIGIN =
  process.env.VITE_SITE_ORIGIN?.trim() ||
  process.env.URL?.trim() ||
  process.env.DEPLOY_PRIME_URL?.trim() ||
  'https://fal-pecas-automotivas.netlify.app'

function loadEnvFile() {
  const envPath = join(root, '.env')
  if (!existsSync(envPath)) return
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i <= 0) continue
    const key = t.slice(0, i).trim()
    let val = t.slice(i + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    if (process.env[key] == null) process.env[key] = val
  }
}

function escapeXml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function buildSitemapXml(entries) {
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

function staticEntries(origin) {
  return [
    { loc: `${origin}/`, changefreq: 'daily', priority: 1 },
    { loc: `${origin}/catalogo`, changefreq: 'daily', priority: 0.9 },
    { loc: `${origin}/veiculo`, changefreq: 'weekly', priority: 0.7 },
    { loc: `${origin}/termos`, changefreq: 'yearly', priority: 0.3 },
    { loc: `${origin}/privacidade`, changefreq: 'yearly', priority: 0.3 },
  ]
}

async function fetchPublishedProductsRest(url, anonKey) {
  const products = []
  const pageSize = 1000
  let from = 0
  for (;;) {
    const endpoint = new URL('/rest/v1/products', url)
    endpoint.searchParams.set('select', 'slug,updated_at')
    endpoint.searchParams.set('status', 'eq.published')
    endpoint.searchParams.set('slug', 'neq.')
    endpoint.searchParams.set('order', 'updated_at.desc')
    const res = await fetch(endpoint, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        Prefer: 'count=exact',
        Range: `${from}-${from + pageSize - 1}`,
      },
    })
    if (!res.ok) {
      throw new Error(`Supabase products HTTP ${res.status}: ${await res.text()}`)
    }
    const rows = await res.json()
    for (const row of rows) {
      const slug = typeof row.slug === 'string' ? row.slug.trim() : ''
      if (!slug) continue
      products.push({ slug, updatedAt: row.updated_at ?? null })
    }
    if (rows.length < pageSize) break
    from += pageSize
  }
  return products
}

function fetchPublishedProductsViaCli() {
  const dir = mkdtempSync(join(tmpdir(), 'fal-sitemap-'))
  const sqlPath = join(dir, 'products.sql')
  writeFileSync(
    sqlPath,
    `select slug, updated_at::text as updated_at
from products
where status = 'published'
  and coalesce(trim(slug), '') <> ''
order by slug;
`,
    'utf8',
  )
  try {
    const out = execFileSync(
      'npx',
      [
        'supabase',
        'db',
        'query',
        '--remote',
        '--yes',
        '--output-format',
        'json',
        '-f',
        sqlPath,
      ],
      {
        cwd: root,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: process.platform === 'win32',
        windowsVerbatimArguments: false,
      },
    )
    const start = out.indexOf('{')
    const end = out.lastIndexOf('}')
    if (start < 0 || end < start) throw new Error('CLI sem JSON de rows')
    const parsed = JSON.parse(out.slice(start, end + 1))
    const rows = Array.isArray(parsed.rows) ? parsed.rows : []
    return rows
      .map((r) => ({
        slug: typeof r.slug === 'string' ? r.slug.trim() : '',
        updatedAt: r.updated_at ?? null,
      }))
      .filter((p) => p.slug)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

async function main() {
  loadEnvFile()
  const origin = SITE_ORIGIN.replace(/\/$/, '')
  const supabaseUrl = process.env.VITE_SUPABASE_URL?.trim()
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY?.trim()

  let products = []
  if (supabaseUrl && anonKey) {
    products = await fetchPublishedProductsRest(supabaseUrl, anonKey)
  } else {
    try {
      products = fetchPublishedProductsViaCli()
      console.log(`[sitemap] fonte: supabase CLI (${products.length} produtos)`)
    } catch (err) {
      console.warn(
        '[sitemap] Sem VITE_SUPABASE_* e CLI indisponível — só rotas estáticas:',
        err instanceof Error ? err.message : err,
      )
    }
  }

  const seen = new Set()
  const entries = [...staticEntries(origin)]
  for (const p of products) {
    if (seen.has(p.slug)) continue
    seen.add(p.slug)
    entries.push({
      loc: `${origin}/produto/${encodeURIComponent(p.slug)}`,
      lastmod: p.updatedAt ? String(p.updatedAt).slice(0, 10) : undefined,
      changefreq: 'weekly',
      priority: 0.8,
    })
  }

  writeFileSync(outPath, buildSitemapXml(entries), 'utf8')
  console.log(`[sitemap] ${entries.length} URLs → ${outPath} (${products.length} produtos)`)
}

main().catch((err) => {
  console.error('[sitemap] falha:', err instanceof Error ? err.message : err)
  process.exitCode = 1
})
