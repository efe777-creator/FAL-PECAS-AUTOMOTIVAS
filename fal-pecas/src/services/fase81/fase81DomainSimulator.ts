/**
 * F8.1-H — simulador do domínio (sem I/O) espelhando contratos das RPCs B–F.
 * Valida a cadeia E2E e as regras D15–D18 / origem D16.
 */

import {
  calculateSellPrice,
  computeCostTotal,
  shouldRecalculatePriceOnCostChange,
  type PricingMethod,
} from '@/services/pricing/pricingFormulas'

export type PriceOrigin = 'calculated' | 'imported' | 'manual'
export type Role = 'administrador' | 'gerente' | 'atendimento' | 'cliente'

export type SimProduct = {
  sku: string
  name: string
  status: 'draft' | 'published'
  isAvailable: boolean
  supplierId: string | null
}

export type SimConversion = {
  supplierId: string
  supplierSku: string
  falSku: string
}

export type SimCost = {
  supplierId: string
  supplierSku: string
  cost: number
}

export type SimPriceItem = {
  sku: string
  price: number
  origin: PriceOrigin
  extraCost: number
}

export type SimListRule = {
  method: PricingMethod
  percent: number
}

export type SimImportHistory = {
  kind: string
  lines: number
  result: string
  errors: string[]
  origin?: PriceOrigin
}

export class Fase81DomainSimulator {
  products = new Map<string, SimProduct>()
  conversions: SimConversion[] = []
  costs: SimCost[] = []
  priceItems = new Map<string, SimPriceItem>()
  rule: SimListRule = { method: 'fixed', percent: 0 }
  history: SimImportHistory[] = []
  stockMoves = 0
  ordersTouched = 0

  assertRole(role: Role): void {
    if (role !== 'administrador' && role !== 'gerente') {
      throw new Error('Somente administrador ou gerente')
    }
  }

  /** F8.1-B: codigo;descricao → draft + is_available=false; sem publicar. */
  importCatalog(
    role: Role,
    rows: { sku: string; name: string }[],
  ): { created: number; updated: number; failed: number } {
    this.assertRole(role)
    let created = 0
    let updated = 0
    let failed = 0
    const seen = new Set<string>()
    for (const row of rows) {
      if (!row.sku || !row.name || seen.has(row.sku)) {
        failed += 1
        continue
      }
      seen.add(row.sku)
      const existing = this.products.get(row.sku)
      if (existing) {
        existing.name = row.name
        // NÃO altera status / is_available
        updated += 1
      } else {
        this.products.set(row.sku, {
          sku: row.sku,
          name: row.name,
          status: 'draft',
          isAvailable: false,
          supplierId: null,
        })
        created += 1
      }
    }
    this.history.push({
      kind: 'catalog',
      lines: rows.length,
      result: `created=${created};updated=${updated};failed=${failed}`,
      errors: failed ? ['linhas invalidas/duplicadas'] : [],
    })
    return { created, updated, failed }
  }

  /** F8.1-C: conversão; SKU FAL inexistente = erro; não cria produto. */
  importConversion(
    role: Role,
    supplierId: string,
    rows: { falSku: string; supplierSku: string }[],
  ): { created: number; updated: number; failed: string[] } {
    this.assertRole(role)
    if (!supplierId) throw new Error('Fornecedor obrigatorio')
    let created = 0
    let updated = 0
    const failed: string[] = []
    const fileDup = new Set<string>()

    for (const row of rows) {
      if (fileDup.has(row.supplierSku)) {
        failed.push(`duplicidade fornecedor ${row.supplierSku}`)
        continue
      }
      fileDup.add(row.supplierSku)

      if (!this.products.has(row.falSku)) {
        failed.push(`SKU FAL inexistente ${row.falSku}`)
        continue
      }

      const bySupplierSku = this.conversions.find(
        (c) => c.supplierId === supplierId && c.supplierSku === row.supplierSku,
      )
      if (bySupplierSku) {
        bySupplierSku.falSku = row.falSku
        updated += 1
        continue
      }

      this.conversions.push({
        supplierId,
        supplierSku: row.supplierSku,
        falSku: row.falSku,
      })
      const p = this.products.get(row.falSku)!
      p.supplierId = supplierId
      created += 1
    }

    this.history.push({
      kind: 'supplier_conversion',
      lines: rows.length,
      result: `created=${created};updated=${updated};failed=${failed.length}`,
      errors: failed,
    })
    return { created, updated, failed }
  }

  /** F8.1-D: custo na conversão existente. */
  importCost(
    role: Role,
    supplierId: string,
    rows: { supplierSku: string; cost: number | null }[],
  ): { updated: number; failed: string[] } {
    this.assertRole(role)
    let updated = 0
    const failed: string[] = []

    for (const row of rows) {
      if (row.cost == null || Number.isNaN(row.cost) || row.cost < 0) {
        failed.push(`custo invalido ${row.supplierSku}`)
        continue
      }
      const conv = this.conversions.find(
        (c) => c.supplierId === supplierId && c.supplierSku === row.supplierSku,
      )
      if (!conv) {
        failed.push(`conversao inexistente ${row.supplierSku}`)
        continue
      }
      const existing = this.costs.find(
        (c) => c.supplierId === supplierId && c.supplierSku === row.supplierSku,
      )
      if (existing) existing.cost = row.cost
      else this.costs.push({ supplierId, supplierSku: row.supplierSku, cost: row.cost })
      updated += 1
      this.recalcAfterCostChange(conv.falSku)
    }

    this.history.push({
      kind: 'supplier_cost',
      lines: rows.length,
      result: `updated=${updated};failed=${failed.length}`,
      errors: failed,
    })
    return { updated, failed }
  }

  /** Custo usado pela lista = supplier_products.cost do products.supplier_id. */
  baseCostForSku(sku: string): number | null {
    const p = this.products.get(sku)
    if (!p?.supplierId) return null
    const conv = this.conversions.find(
      (c) => c.supplierId === p.supplierId && c.falSku === sku,
    )
    if (!conv) return null
    const cost = this.costs.find(
      (c) => c.supplierId === p.supplierId && c.supplierSku === conv.supplierSku,
    )
    return cost?.cost ?? null
  }

  setRule(role: Role, method: PricingMethod, percent: number, apply = true): void {
    this.assertRole(role)
    if (method === 'margin_on_sell' && percent >= 100) {
      throw new Error('Margem invalida')
    }
    this.rule = { method, percent }
    if (apply && method !== 'fixed') this.recalculateCalculated(role)
  }

  putCalculated(sku: string, extraCost = 0): void {
    const base = this.baseCostForSku(sku)
    if (base == null) throw new Error('Custo ausente')
    if (this.rule.method === 'fixed') throw new Error('Lista em modo fixo')
    const total = computeCostTotal(base, extraCost, 0)
    const price = calculateSellPrice(total, this.rule.method, this.rule.percent)
    if (price == null) throw new Error('Nao calculavel')
    this.priceItems.set(sku, { sku, price, origin: 'calculated', extraCost })
  }

  putManual(sku: string, price: number, extraCost = 0): void {
    this.priceItems.set(sku, { sku, price, origin: 'manual', extraCost })
  }

  /** F8.1-F: import venda → imported; sem recalc geral. */
  importSellPrices(
    role: Role,
    rows: { sku: string; price: number | null }[],
  ): { applied: number; failed: string[] } {
    this.assertRole(role)
    let applied = 0
    const failed: string[] = []
    const seen = new Set<string>()

    for (const row of rows) {
      if (seen.has(row.sku)) {
        failed.push(`duplicidade ${row.sku}`)
        continue
      }
      seen.add(row.sku)
      if (!this.products.has(row.sku)) {
        failed.push(`SKU inexistente ${row.sku}`)
        continue
      }
      if (row.price == null || Number.isNaN(row.price) || row.price < 0) {
        failed.push(`preco invalido ${row.sku}`)
        continue
      }
      const prev = this.priceItems.get(row.sku)
      this.priceItems.set(row.sku, {
        sku: row.sku,
        price: row.price,
        origin: 'imported',
        extraCost: prev?.extraCost ?? 0,
      })
      applied += 1
    }

    this.history.push({
      kind: 'price_list',
      lines: rows.length,
      result: `applied=${applied};failed=${failed.length}`,
      errors: failed,
      origin: 'imported',
    })
    return { applied, failed }
  }

  /** D16: só calculated recalcula quando custo muda. */
  private recalcAfterCostChange(sku: string): void {
    const item = this.priceItems.get(sku)
    if (!item) return
    if (!shouldRecalculatePriceOnCostChange(item.origin)) return
    if (this.rule.method === 'fixed') return
    const base = this.baseCostForSku(sku)
    if (base == null) return
    const total = computeCostTotal(base, item.extraCost, 0)
    const price = calculateSellPrice(total, this.rule.method, this.rule.percent)
    if (price == null) return
    item.price = price
  }

  recalculateCalculated(role: Role): {
    updated: number
    skippedManual: number
    skippedImported: number
  } {
    this.assertRole(role)
    let updated = 0
    let skippedManual = 0
    let skippedImported = 0
    for (const item of this.priceItems.values()) {
      if (item.origin === 'manual') {
        skippedManual += 1
        continue
      }
      if (item.origin === 'imported') {
        skippedImported += 1
        continue
      }
      const before = item.price
      this.recalcAfterCostChange(item.sku)
      if (this.priceItems.get(item.sku)?.price !== before) updated += 1
      else if (item.origin === 'calculated') updated += 1 // conta como processado
    }
    return { updated, skippedManual, skippedImported }
  }

  /** Ação explícita: voltar ao cálculo. */
  returnToCalculated(role: Role, sku: string): void {
    this.assertRole(role)
    const prev = this.priceItems.get(sku)
    this.putCalculated(sku, prev?.extraCost ?? 0)
  }

  isSellable(sku: string): boolean {
    const p = this.products.get(sku)
    return Boolean(p && p.status === 'published' && p.isAvailable)
  }
}
