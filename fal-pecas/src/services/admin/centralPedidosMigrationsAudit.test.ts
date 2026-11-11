import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(__dirname, '../../../supabase/migrations')

function read(name: string): string {
  return readFileSync(resolve(root, name), 'utf8')
}

describe('Central Pedidos migrations audit (Fase 3 A)', () => {
  it('SEC-030 revoke INSERT orders/order_items', () => {
    const sql = read('20261111183000_cp_sec030_revoke_orders_insert.sql')
    expect(sql).toMatch(/revoke insert on public\.orders/i)
    expect(sql).toMatch(/drop policy if exists orders_insert_own/i)
  })

  it('CAN-POST bloqueia approve pós enviado/entregue', () => {
    const sql = read('20261111191000_cp_can_post_block_cancel_after_ship.sql')
    expect(sql).toMatch(/enviado',\s*'entregue/)
    expect(sql).toMatch(/pos-venda|pós-venda|pos-venda|ocorrencia/i)
  })

  it('EMB packing grava só metadata.packing (jsonb_set path)', () => {
    const sql = read('20261111193000_cp_emb_evt_packing_occurrences.sql')
    expect(sql).toMatch(/jsonb_set\(v_meta,\s*'\{packing\}'/i)
    expect(sql).not.toMatch(/jsonb_set\(v_meta,\s*'\{me\}'/i)
    expect(sql).toMatch(/admin_set_order_packing/i)
  })

  it('EVT occurrence_id + opened/updated/resolved', () => {
    const sql = read('20261111193000_cp_emb_evt_packing_occurrences.sql')
    expect(sql).toMatch(/occurrence_opened/)
    expect(sql).toMatch(/occurrence_updated/)
    expect(sql).toMatch(/occurrence_resolved/)
    expect(sql).toMatch(/occurrence_id/)
  })

  it('CEN-011 indicadores net_received = captured - refunded', () => {
    const sql = read('20261111190000_cp_cen011_central_indicators.sql')
    expect(sql).toMatch(/net_received',\s*v_captured\s*-\s*v_refunded/)
  })
})
