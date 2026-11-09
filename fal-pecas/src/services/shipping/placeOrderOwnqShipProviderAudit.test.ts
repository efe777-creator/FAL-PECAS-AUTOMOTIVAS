import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const MIGRATION = resolve(
  __dirname,
  '../../../supabase/migrations/20261105140000_fix_place_order_ownq_ship_provider.sql',
)

describe('place_order ownq ship_provider (O1-D audit)', () => {
  const sql = readFileSync(MIGRATION, 'utf8')

  it('reescreve place_order com v_ship_provider', () => {
    expect(sql).toMatch(/create or replace function public\.place_order\(p_payload jsonb\)/i)
    expect(sql).toMatch(/v_ship_provider text/)
  })

  it('ownq define provider own antes do insert em shipments', () => {
    expect(sql).toMatch(/v_shipping_option_id like 'ownq:%'/)
    expect(sql).toMatch(/v_ship_provider := 'own'/)
    expect(sql).toMatch(
      /insert into public\.shipments[\s\S]*coalesce\(v_ship_provider, 'mock'\)/i,
    )
  })

  it('não avalia v_ship.provider no ramo ownq (CASE sobre record não atribuído)', () => {
    // O bug era CASE/ELSE acessando v_ship.provider sem SELECT INTO no branch ownq.
    expect(sql).not.toMatch(
      /insert into public\.shipments[\s\S]*case[\s\S]*v_ship\.provider/i,
    )
  })

  it('consome cotação ownq e exige número no endereço', () => {
    expect(sql).toMatch(/elsif v_is_ownq then/)
    expect(sql).toMatch(/Falha ao consumir cotação frete próprio/)
    expect(sql).toMatch(/Número do endereço obrigatório para frete próprio/)
  })
})
