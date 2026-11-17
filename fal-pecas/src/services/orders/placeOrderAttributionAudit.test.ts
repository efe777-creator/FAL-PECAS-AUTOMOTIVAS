import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const MIGRATION = resolve(
  __dirname,
  '../../../supabase/migrations/20261116220000_orders_attribution_prep_ads.sql',
)

describe('place_order attribution prep Ads (migration audit)', () => {
  const sql = readFileSync(MIGRATION, 'utf8')

  it('adiciona orders.attribution e sanitiza payload', () => {
    expect(sql).toMatch(/add column if not exists attribution jsonb/i)
    expect(sql).toMatch(/create or replace function public\.sanitize_order_attribution/i)
    expect(sql).toMatch(/gclid/)
    expect(sql).toMatch(/fbclid/)
  })

  it('envolve core via rename e revoga execute do core na API', () => {
    expect(sql).toMatch(/to_regprocedure\('public\.place_order\(jsonb\)'\)/i)
    expect(sql).toMatch(/rename to place_order_core_hybrid/i)
    expect(sql).toMatch(/place_order_core_hybrid\(p_payload\)/)
    expect(sql).toMatch(
      /revoke all on function public\.place_order_core_hybrid\(jsonb\)\s+from public, anon, authenticated, service_role/i,
    )
    expect(sql).toMatch(
      /grant execute on function public\.place_order\(jsonb\) to authenticated, service_role/i,
    )
  })
})
