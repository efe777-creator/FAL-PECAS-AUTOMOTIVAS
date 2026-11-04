/**
 * MARCHA: padroniza models ALL CAPS → title case comercial.
 * Uso: pnpm exec tsx scripts/marcha-model-titlecase.run.ts [--apply]
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  formatModelDisplayName,
  normalizeEntityMatchKey,
} from '../src/lib/entityNormalize.ts'

function loadEnv(): { url: string; key: string } {
  const envPath = resolve(process.cwd(), '.env')
  const env = readFileSync(envPath, 'utf8')
  const map: Record<string, string> = {}
  for (const line of env.split(/\r?\n/)) {
    const m = line.match(/^([^#=]+)=(.*)$/)
    if (!m) continue
    const k = m[1].trim()
    let v = m[2].trim()
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1)
    }
    map[k] = v
  }
  const url = map.VITE_SUPABASE_URL || map.SUPABASE_URL
  const key =
    map.SUPABASE_SERVICE_ROLE_KEY ||
    map.VITE_SUPABASE_SERVICE_ROLE_KEY ||
    map.VITE_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Missing Supabase URL/key in .env')
  return { url, key }
}

function isAllCapsName(name: string): boolean {
  const letters = name.replace(/[^A-Za-zÀ-ÿ]/g, '')
  if (!letters) return false
  return letters === letters.toLocaleUpperCase('pt-BR')
}

async function main() {
  const apply = process.argv.includes('--apply')
  const { url, key } = loadEnv()
  const sb = createClient(url, key)

  const { data, error } = await sb
    .from('models')
    .select('id, name, slug, manufacturer_id, status, manufacturers(name)')
    .eq('status', 'active')
  if (error) throw error

  type Row = {
    id: string
    name: string
    slug: string
    manufacturer_id: string
    status: string
    manufacturers: { name: string } | { name: string }[] | null
  }

  const rows = (data ?? []) as Row[]
  const byMaker = new Map<string, Row[]>()
  for (const r of rows) {
    const list = byMaker.get(r.manufacturer_id) ?? []
    list.push(r)
    byMaker.set(r.manufacturer_id, list)
  }

  const plan: Array<{
    id: string
    maker: string
    from: string
    to: string
  }> = []
  const collisions: Array<{ maker: string; from: string; to: string; other: string }> =
    []

  for (const r of rows) {
    if (!isAllCapsName(r.name)) continue
    const to = formatModelDisplayName(r.name)
    if (!to || to === r.name) continue

    const makerRel = r.manufacturers
    const maker = Array.isArray(makerRel)
      ? (makerRel[0]?.name ?? '?')
      : (makerRel?.name ?? '?')

    const siblings = byMaker.get(r.manufacturer_id) ?? []
    const clash = siblings.find(
      (s) =>
        s.id !== r.id &&
        normalizeEntityMatchKey(s.name) === normalizeEntityMatchKey(to),
    )
    if (clash) {
      collisions.push({ maker, from: r.name, to, other: clash.name })
      continue
    }
    plan.push({ id: r.id, maker, from: r.name, to })
  }

  console.log(JSON.stringify({ apply, candidates: plan.length, collisions, sample: plan.slice(0, 15) }, null, 2))

  if (collisions.length) {
    console.error('STOP: colisões — não apply')
    process.exit(2)
  }
  if (!apply) {
    console.log('Dry-run OK. Rode com --apply para gravar.')
    return
  }

  let ok = 0
  for (const p of plan) {
    const { error: upErr } = await sb.from('models').update({ name: p.to }).eq('id', p.id)
    if (upErr) throw new Error(`${p.from} → ${p.to}: ${upErr.message}`)
    ok++
  }
  console.log(JSON.stringify({ updated: ok }, null, 2))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
