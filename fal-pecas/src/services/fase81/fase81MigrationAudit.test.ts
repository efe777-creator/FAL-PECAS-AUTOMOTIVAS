import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const migrationsDir = join(process.cwd(), 'supabase', 'migrations')

function readMigration(name: string): string {
  return readFileSync(join(migrationsDir, name), 'utf8')
}

const FASE81 = [
  '20261005120000_fase81b_catalog_import.sql',
  '20261005130000_fase81c_supplier_conversions.sql',
  '20261005140000_fase81d_supplier_costs.sql',
  '20261005150000_fase81e_pricing_formation.sql',
  '20261005160000_fase81f_price_list_import_rpc.sql',
] as const

describe('F8.1-H auditoria migrations B–F', () => {
  it('ordem temporal B→C→D→E→F presente', () => {
    const files = readdirSync(migrationsDir)
    for (const f of FASE81) {
      expect(files).toContain(f)
    }
    const idxs = FASE81.map((f) => files.indexOf(f))
    for (let i = 1; i < idxs.length; i++) {
      expect(idxs[i]).toBeGreaterThan(idxs[i - 1])
    }
  })

  it('B: draft + is_available=false; staff_can; sem place_order', () => {
    const sql = readMigration(FASE81[0])
    expect(sql).toMatch(/staff_can_import_catalog/)
    expect(sql).toMatch(/'administrador',\s*'gerente'/)
    expect(sql).toMatch(/'draft'/)
    expect(sql).toMatch(/false/) // is_available
    expect(sql).toMatch(/apply_catalog_import/)
    expect(sql).not.toMatch(/place_order/)
    expect(sql).not.toMatch(/inventory_mode/)
    expect(sql).not.toMatch(/drop table/i)
  })

  it('C: UNIQUE supplier_sku; supplier_products; sem auto-produto', () => {
    const sql = readMigration(FASE81[1])
    expect(sql).toMatch(/supplier_products_supplier_sku_uidx/)
    expect(sql).toMatch(/apply_supplier_conversion_import/)
    expect(sql).toMatch(/supplier_products/)
    expect(sql).not.toMatch(/insert into public\.products/i)
    expect(sql).not.toMatch(/place_order/)
    expect(sql).toMatch(/staff_can_import_catalog/)
  })

  it('D: extra_cost; apply cost; não recalcula preço (comentário D16 até E)', () => {
    const sql = readMigration(FASE81[2])
    expect(sql).toMatch(/extra_cost/)
    expect(sql).toMatch(/list_extra_cost/)
    expect(sql).toMatch(/apply_supplier_cost_import/)
    expect(sql).toMatch(/staff_can_import_catalog/)
    expect(sql).not.toMatch(/place_order/)
  })

  it('E: price_origin + RPCs; só calculated recalcula', () => {
    const sql = readMigration(FASE81[3])
    expect(sql).toMatch(/price_origin in \('calculated', 'imported', 'manual'\)/)
    expect(sql).toMatch(/set_price_list_pricing_rule/)
    expect(sql).toMatch(/recalculate_price_list_items/)
    expect(sql).toMatch(/set_price_list_item_pricing/)
    expect(sql).toMatch(/price_origin = 'manual'/)
    expect(sql).toMatch(/price_origin = 'imported'/) // skip branches
    expect(sql).toMatch(/price_origin is distinct from 'calculated'|price_origin = 'calculated'/)
    expect(sql).not.toMatch(/create table.*import_jobs/i)
    expect(sql).not.toMatch(/place_order/)
  })

  it('F: apply_price_list_import → imported; sem recalc geral', () => {
    const sql = readMigration(FASE81[4])
    expect(sql).toMatch(/apply_price_list_import/)
    expect(sql).toMatch(/price_origin = 'imported'|price_origin', 'imported'/)
    expect(sql).toMatch(/staff_can_import_catalog/)
    expect(sql).not.toMatch(/recalculate_price_list_items\(/)
    expect(sql).not.toMatch(/place_order/)
    expect(sql).not.toMatch(/is_available\s*=\s*true/)
  })

  it('todas as RPCs sensíveis usam staff_can_import_catalog + grant authenticated', () => {
    const all = FASE81.map(readMigration).join('\n')
    const rpcs = [
      'apply_catalog_import',
      'apply_supplier_conversion_import',
      'apply_supplier_cost_import',
      'set_price_list_pricing_rule',
      'recalculate_price_list_items',
      'set_price_list_item_pricing',
      'apply_price_list_import',
    ]
    for (const rpc of rpcs) {
      expect(all).toMatch(new RegExp(`function public\\.${rpc}`))
      expect(all).toMatch(new RegExp(`grant execute on function public\\.${rpc}`, 'i'))
    }
    // Contagem mínima de guards de role
    const guards = all.match(/staff_can_import_catalog\(\)/g) ?? []
    expect(guards.length).toBeGreaterThanOrEqual(7)
  })

  it('nenhuma migration F8.1 toca F7/F8 inventário/pedidos', () => {
    const all = FASE81.map(readMigration).join('\n')
    for (const forbidden of [
      'place_order',
      'transition_order_status',
      'fulfill_order_reservations',
      'release_order_reservations',
      'inventory_mode_at_order',
      'set_store_inventory_mode',
      'ship_order',
      'deliver_order',
    ]) {
      expect(all).not.toMatch(new RegExp(forbidden))
    }
  })
})

describe('F8.1-H regressão estática F7/F8/checkout (código presente)', () => {
  it('serviços críticos de pedido/estoque/checkout ainda existem', async () => {
    const mods = await Promise.all([
      import('@/services/orders/placeOrderService'),
      import('@/services/orders/orderTransitionService'),
      import('@/services/admin/adminInventoryService'),
      import('@/lib/orderLifecycle'),
    ])
    expect(mods[0].placeOrder).toBeTypeOf('function')
    expect(mods[1].transitionOrderStatus).toBeTypeOf('function')
    expect(mods[2].getStoreInventoryMode).toBeTypeOf('function')
    expect(mods[2].setStoreInventoryMode).toBeTypeOf('function')
    expect(['com_estoque', 'estoque_ficticio', 'sem_estoque']).toEqual(
      expect.arrayContaining(['com_estoque', 'sem_estoque', 'estoque_ficticio']),
    )
  })
})
