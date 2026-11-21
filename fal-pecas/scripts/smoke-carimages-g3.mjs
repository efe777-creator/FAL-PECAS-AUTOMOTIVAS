/**
 * Smoke G3 CarImages — cobertura BR (Palio/Gol/Onix/HB20).
 * Uso:
 *   set CARIMAGES_API_KEY=ci_NOVA
 *   node scripts/smoke-carimages-g3.mjs
 * Sem key: gera relatório PENDING (não falha o CI de código).
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, '..', 'tmp')
const outFile = join(outDir, 'smoke-carimages-g3.json')

const CASES = [
  { make: 'Fiat', model: 'Palio', year: 2015 },
  { make: 'Volkswagen', model: 'Gol', year: 2018 },
  { make: 'Chevrolet', model: 'Onix', year: 2020 },
  { make: 'Hyundai', model: 'HB20', year: 2019 },
]

const key = (process.env.CARIMAGES_API_KEY || '').trim()
const secret = (process.env.CARIMAGES_API_SECRET || '').trim()
const endpoint = 'https://carimagesapi.com/api/v1/signed-url'

async function probe(c) {
  if (!key) {
    return { ...c, status: 'PENDING_KEY', note: 'Defina CARIMAGES_API_KEY rotacionada' }
  }
  const q = new URLSearchParams({
    api_key: key,
    make: c.make,
    model: c.model,
    year: String(c.year),
    view: 'front34',
    width: '800',
    format: 'webp',
  })
  if (secret) q.set('api_secret', secret)
  const t0 = Date.now()
  try {
    const res = await fetch(`${endpoint}?${q}`)
    const body = await res.json().catch(() => ({}))
    const url = typeof body?.url === 'string' ? body.url : null
    return {
      ...c,
      status: res.ok && url ? 'PASS' : 'MISS',
      http: res.status,
      ms: Date.now() - t0,
      hasUrl: Boolean(url),
      watermarkLikely: Boolean(url && /watermark|free/i.test(url)),
      note: res.ok && url
        ? 'family/ilustrativa — Free pode ter watermark'
        : body?.error || body?.message || 'sem url',
    }
  } catch (e) {
    return {
      ...c,
      status: 'ERROR',
      ms: Date.now() - t0,
      note: e instanceof Error ? e.message : String(e),
    }
  }
}

const results = []
for (const c of CASES) results.push(await probe(c))

const report = {
  at: new Date().toISOString(),
  levelPolicy: 'family',
  label: 'Imagem ilustrativa da família/estúdio',
  keyPresent: Boolean(key),
  results,
  summary: {
    pass: results.filter((r) => r.status === 'PASS').length,
    miss: results.filter((r) => r.status === 'MISS').length,
    pending: results.filter((r) => r.status === 'PENDING_KEY').length,
    error: results.filter((r) => r.status === 'ERROR').length,
  },
}

mkdirSync(outDir, { recursive: true })
writeFileSync(outFile, JSON.stringify(report, null, 2), 'utf8')
console.log(JSON.stringify(report, null, 2))
console.log(`\nWrote ${outFile}`)
