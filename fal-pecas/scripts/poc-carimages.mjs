/**
 * PoC CarImages — sem plugar o Engine FAL.
 * Uso: CARIMAGES_API_KEY=ci_NOVA node scripts/poc-carimages.mjs
 * Nunca use a key comprometida do chat.
 */
const BASE = 'https://carimagesapi.com'
const KEY = process.env.CARIMAGES_API_KEY || ''
const SECRET = process.env.CARIMAGES_API_SECRET || ''

const vehicles = [
  { make: 'Fiat', model: 'Palio', year: 2015 },
  { make: 'Volkswagen', model: 'Gol', year: 2018 },
  { make: 'Chevrolet', model: 'Onix', year: 2020 },
  { make: 'Hyundai', model: 'HB20', year: 2019 },
  { make: 'Jeep', model: 'Renegade', year: 2022 },
  { make: 'Volkswagen', model: 'Polo', year: 2015 },
]

async function getJson(url, headers = {}) {
  const t0 = Date.now()
  const res = await fetch(url, { headers })
  const ms = Date.now() - t0
  const text = await res.text()
  let json = null
  try {
    json = JSON.parse(text)
  } catch {
    /* ignore */
  }
  return { status: res.status, ms, json, text: text.slice(0, 200) }
}

async function main() {
  const report = {
    at: new Date().toISOString(),
    hasKey: Boolean(KEY),
    hasSecret: Boolean(SECRET),
    note: KEY
      ? 'Key presente via env (não logada).'
      : 'Sem CARIMAGES_API_KEY — só catálogo público / estrutura PoC.',
    catalog: {},
    vehicles: [],
  }

  report.catalog.makes = await getJson(`${BASE}/api/v1/makes`)
  const fiat = await getJson(`${BASE}/api/v1/makes/fiat/models`)
  report.catalog.fiatModelsStatus = fiat.status
  report.catalog.fiatModelsMs = fiat.ms
  report.catalog.fiatSample = Array.isArray(fiat.json)
    ? fiat.json.slice(0, 5)
    : fiat.json?.models?.slice?.(0, 5) ?? fiat.text

  for (const v of vehicles) {
    const row = { ...v, image: null, model3d: null, modelSlug: null, genSlug: null }
    if (KEY) {
      const q = new URLSearchParams({
        make: v.make,
        model: v.model,
        year: String(v.year),
        view: 'front34',
        width: '400',
        format: 'webp',
        key: KEY,
      })
      const t0 = Date.now()
      const img = await fetch(`${BASE}/image?${q}`, { redirect: 'manual' })
      row.image = {
        status: img.status,
        ms: Date.now() - t0,
        location: img.headers.get('location')?.slice(0, 120) ?? null,
        xView: img.headers.get('x-ci-view'),
        xColor: img.headers.get('x-ci-color'),
      }
    }

    const models = await getJson(
      `${BASE}/api/v1/makes/${encodeURIComponent(v.make.toLowerCase())}/models`,
    )
    const list = Array.isArray(models.json)
      ? models.json
      : models.json?.models ?? []
    const hit = list.find?.(
      (m) =>
        String(m.slug || m.name || '')
          .toLowerCase()
          .includes(v.model.toLowerCase().replace(/\s+/g, '-')) ||
        String(m.name || '')
          .toLowerCase()
          .includes(v.model.toLowerCase()),
    )
    if (hit) {
      row.modelSlug = hit.slug || hit.name
      const detail = await getJson(
        `${BASE}/api/v1/makes/${encodeURIComponent(v.make.toLowerCase())}/models/${encodeURIComponent(row.modelSlug)}`,
      )
      const gens = detail.json?.generations ?? detail.json?.gens ?? []
      const gen =
        gens.find?.((g) => {
          const y = v.year
          const from = g.year_from ?? g.from ?? g.start
          const to = g.year_to ?? g.to ?? g.end
          if (from != null && y < from) return false
          if (to != null && y > to) return false
          return true
        }) ?? gens[0]
      row.genSlug = gen?.slug || gen?.id || null
      if (row.genSlug && (KEY || SECRET)) {
        const url = `${BASE}/api/v1/vehicles/${encodeURIComponent(v.make.toLowerCase())}/${encodeURIComponent(row.modelSlug)}/${encodeURIComponent(row.genSlug)}/model`
        const headers = {}
        if (KEY) headers['x-api-key'] = KEY
        const qs = new URLSearchParams()
        if (KEY) qs.set('api_key', KEY)
        if (SECRET) qs.set('api_secret', SECRET)
        const full = qs.toString() ? `${url}?${qs}` : url
        row.model3d = await getJson(full)
        if (row.model3d.json) {
          row.model3d.flags = {
            watermarked: Boolean(row.model3d.json.watermarked),
            fallback: Boolean(row.model3d.json.fallback),
            hasUrl: Boolean(row.model3d.json.url || row.model3d.json.model),
          }
        }
      }
    }
    report.vehicles.push(row)
  }

  console.log(JSON.stringify(report, null, 2))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
