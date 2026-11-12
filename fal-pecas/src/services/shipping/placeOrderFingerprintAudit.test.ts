import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const MIGRATION = resolve(
  __dirname,
  '../../../supabase/migrations/20261112183000_place_order_fingerprint_sec035.sql',
)

describe('place_order fingerprint + SEC-035 (Marcha 2 / 1c)', () => {
  const sql = readFileSync(MIGRATION, 'utf8')

  it('define assert_shipping_quote_fingerprint e chama no place_order', () => {
    expect(sql).toMatch(/create or replace function public\.assert_shipping_quote_fingerprint/i)
    expect(sql).toMatch(/perform public\.assert_shipping_quote_fingerprint/i)
    expect(sql).toMatch(/Cotação Melhor Envio incompatível com o carrinho/i)
    expect(sql).toMatch(/Cotação própria incompatível com o carrinho/i)
  })

  it('mantém v_ship_provider own/me/mock', () => {
    expect(sql).toMatch(/v_ship_provider := 'own'/)
    expect(sql).toMatch(/v_ship_provider := 'melhorenvio'/)
    expect(sql).toMatch(/coalesce\(v_ship_provider, 'mock'\)/)
  })

  it('remove policy shipments_staff_write (SEC-035)', () => {
    expect(sql).toMatch(/drop policy if exists shipments_staff_write on public\.shipments/i)
  })
})
