import { describe, expect, it } from 'vitest'
import { Fase81DomainSimulator } from './fase81DomainSimulator'
import { calculateSellPrice, computeCostTotal } from '@/services/pricing/pricingFormulas'

describe('F8.1-H E2E cadeia principal', () => {
  it('cadastro → conversão → custo → regra → calculated → import → imported → custo preserva → voltar → recalc', () => {
    const sim = new Fase81DomainSimulator()

    // Cadastro
    const cat = sim.importCatalog('administrador', [
      { sku: 'TDI1083', name: 'Pivo Suspensao' },
      { sku: 'TDI1084', name: 'Terminal' },
    ])
    expect(cat.created).toBe(2)
    const p = sim.products.get('TDI1083')!
    expect(p.status).toBe('draft')
    expect(p.isAvailable).toBe(false)
    expect(sim.isSellable('TDI1083')).toBe(false)

    // Reimport cadastro: idempotente, não publica
    const cat2 = sim.importCatalog('gerente', [
      { sku: 'TDI1083', name: 'Pivo Suspensao Atualizado' },
    ])
    expect(cat2.updated).toBe(1)
    expect(sim.products.get('TDI1083')!.status).toBe('draft')
    expect(sim.products.get('TDI1083')!.isAvailable).toBe(false)

    // Conversão — fornecedor obrigatório
    expect(() =>
      sim.importConversion('administrador', '', [{ falSku: 'TDI1083', supplierSku: 'ABC' }]),
    ).toThrow(/Fornecedor/)

    const conv = sim.importConversion('administrador', 'sup-a', [
      { falSku: 'TDI1083', supplierSku: 'ABC123' },
      { falSku: 'TDI1084', supplierSku: 'ABC124' },
    ])
    expect(conv.created).toBe(2)

    // Reimport conversão: idempotente
    const conv2 = sim.importConversion('administrador', 'sup-a', [
      { falSku: 'TDI1083', supplierSku: 'ABC123' },
    ])
    expect(conv2.updated).toBe(1)
    expect(sim.conversions.filter((c) => c.supplierSku === 'ABC123')).toHaveLength(1)

    // Código fornecedor duplicado no arquivo
    const dup = sim.importConversion('administrador', 'sup-a', [
      { falSku: 'TDI1083', supplierSku: 'DUP' },
      { falSku: 'TDI1084', supplierSku: 'DUP' },
    ])
    expect(dup.failed.some((e) => /duplicidade/.test(e))).toBe(true)

    // SKU FAL inexistente
    const miss = sim.importConversion('administrador', 'sup-a', [
      { falSku: 'NOPE', supplierSku: 'X1' },
    ])
    expect(miss.failed.some((e) => /inexistente/.test(e))).toBe(true)
    expect(sim.products.has('NOPE')).toBe(false)

    // Custo válido + update
    expect(sim.importCost('gerente', 'sup-a', [{ supplierSku: 'ABC123', cost: 40 }]).updated).toBe(
      1,
    )
    expect(
      sim.importCost('gerente', 'sup-a', [{ supplierSku: 'ABC123', cost: 42 }]).updated,
    ).toBe(1)
    expect(sim.baseCostForSku('TDI1083')).toBe(42)

    // Custo inválido + conversão inexistente
    const badCost = sim.importCost('gerente', 'sup-a', [
      { supplierSku: 'ABC123', cost: -1 },
      { supplierSku: 'SEMCONV', cost: 10 },
    ])
    expect(badCost.failed).toHaveLength(2)

    // Múltiplos fornecedores: lista usa o do products.supplier_id
    sim.importConversion('administrador', 'sup-b', [
      { falSku: 'TDI1083', supplierSku: 'B-99' },
    ])
    // supplier_id do produto foi sobrescrito para sup-b na última conversão
    sim.products.get('TDI1083')!.supplierId = 'sup-a'
    sim.importCost('gerente', 'sup-b', [{ supplierSku: 'B-99', cost: 10 }])
    expect(sim.baseCostForSku('TDI1083')).toBe(42) // fonte = fornecedor principal

    // Formação: margem + extra
    sim.setRule('administrador', 'margin_on_sell', 30, false)
    sim.putCalculated('TDI1083', 2)
    const expectedMargin = calculateSellPrice(computeCostTotal(42, 2, 0), 'margin_on_sell', 30)
    expect(sim.priceItems.get('TDI1083')!.price).toBe(expectedMargin)
    expect(sim.priceItems.get('TDI1083')!.origin).toBe('calculated')

    // Markup
    sim.setRule('administrador', 'markup_on_cost', 30, false)
    sim.putCalculated('TDI1083', 2)
    expect(sim.priceItems.get('TDI1083')!.price).toBe(
      calculateSellPrice(44, 'markup_on_cost', 30),
    )

    // Fixo não calcula
    sim.setRule('administrador', 'fixed', 0, false)
    expect(() => sim.putCalculated('TDI1083')).toThrow(/fixo/)

    // Volta margem e calculated
    sim.setRule('administrador', 'margin_on_sell', 30, false)
    sim.putCalculated('TDI1083', 2)
    const calcPrice = sim.priceItems.get('TDI1083')!.price

    // Alteração de percentual recalcula calculated
    sim.setRule('administrador', 'margin_on_sell', 40, true)
    const afterPct = sim.priceItems.get('TDI1083')!.price
    expect(afterPct).toBe(calculateSellPrice(44, 'margin_on_sell', 40))
    expect(afterPct).not.toBe(calcPrice)

    // Importação de venda → imported
    const sell = sim.importSellPrices('administrador', [
      { sku: 'TDI1083', price: 99.9 },
      { sku: 'TDI1084', price: 50 },
    ])
    expect(sell.applied).toBe(2)
    expect(sim.priceItems.get('TDI1083')!.origin).toBe('imported')
    expect(sim.priceItems.get('TDI1083')!.price).toBe(99.9)
    expect(sim.history.some((h) => h.kind === 'price_list' && h.origin === 'imported')).toBe(
      true,
    )

    // Duplicidade / SKU inexistente / preço inválido
    const sellBad = sim.importSellPrices('administrador', [
      { sku: 'TDI1083', price: 10 },
      { sku: 'TDI1083', price: 20 },
      { sku: 'ZZZ', price: 1 },
      { sku: 'TDI1084', price: -5 },
    ])
    expect(sellBad.failed.length).toBeGreaterThanOrEqual(3)

    // Reimportação não duplica item
    sim.importSellPrices('administrador', [{ sku: 'TDI1083', price: 88 }])
    expect([...sim.priceItems.keys()].filter((k) => k === 'TDI1083')).toHaveLength(1)
    expect(sim.priceItems.get('TDI1083')!.price).toBe(88)

    // Custo muda: imported preservado
    const importedPrice = 88
    sim.importCost('gerente', 'sup-a', [{ supplierSku: 'ABC123', cost: 80 }])
    expect(sim.priceItems.get('TDI1083')!.origin).toBe('imported')
    expect(sim.priceItems.get('TDI1083')!.price).toBe(importedPrice)

    // Regra muda: imported preservado
    sim.setRule('administrador', 'markup_on_cost', 50, true)
    expect(sim.priceItems.get('TDI1083')!.price).toBe(importedPrice)
    expect(sim.priceItems.get('TDI1083')!.origin).toBe('imported')

    // Manual preservado
    sim.putManual('TDI1084', 77)
    sim.importCost('gerente', 'sup-a', [{ supplierSku: 'ABC124', cost: 5 }])
    sim.setRule('administrador', 'margin_on_sell', 25, true)
    expect(sim.priceItems.get('TDI1084')!.origin).toBe('manual')
    expect(sim.priceItems.get('TDI1084')!.price).toBe(77)

    // Voltar ao cálculo é explícito
    sim.returnToCalculated('administrador', 'TDI1083')
    expect(sim.priceItems.get('TDI1083')!.origin).toBe('calculated')
    const afterReturn = sim.priceItems.get('TDI1083')!.price
    expect(afterReturn).toBe(
      calculateSellPrice(computeCostTotal(80, 2, 0), 'margin_on_sell', 25),
    )

    // Após voltar, alteração de custo recalcula
    sim.importCost('gerente', 'sup-a', [{ supplierSku: 'ABC123', cost: 100 }])
    expect(sim.priceItems.get('TDI1083')!.price).toBe(
      calculateSellPrice(computeCostTotal(100, 2, 0), 'margin_on_sell', 25),
    )

    // Integridade: import não mexeu estoque/pedido; draft não vendável
    expect(sim.stockMoves).toBe(0)
    expect(sim.ordersTouched).toBe(0)
    expect(sim.isSellable('TDI1083')).toBe(false)
  })

  it('segurança: atendimento/cliente bloqueados', () => {
    const sim = new Fase81DomainSimulator()
    expect(() => sim.importCatalog('atendimento', [{ sku: 'A', name: 'B' }])).toThrow(
      /administrador ou gerente/,
    )
    expect(() => sim.importCatalog('cliente', [{ sku: 'A', name: 'B' }])).toThrow(
      /administrador ou gerente/,
    )
    sim.importCatalog('administrador', [{ sku: 'A', name: 'B' }])
    expect(() =>
      sim.importConversion('atendimento', 's', [{ falSku: 'A', supplierSku: 'X' }]),
    ).toThrow()
    expect(() => sim.setRule('atendimento', 'fixed', 0)).toThrow()
    expect(() => sim.importSellPrices('atendimento', [{ sku: 'A', price: 1 }])).toThrow()
  })

  it('checkout invariantes: só published + available vende', () => {
    const sim = new Fase81DomainSimulator()
    sim.importCatalog('administrador', [{ sku: 'V1', name: 'Vendavel' }])
    expect(sim.isSellable('V1')).toBe(false)
    const p = sim.products.get('V1')!
    p.status = 'published'
    expect(sim.isSellable('V1')).toBe(false)
    p.isAvailable = true
    expect(sim.isSellable('V1')).toBe(true)
    // Import de preço não publica
    sim.importSellPrices('administrador', [{ sku: 'V1', price: 10 }])
    // se alguém resetasse — não é o caso; produto já publicado permanece
    expect(sim.products.get('V1')!.status).toBe('published')
    // novo via import continua draft
    sim.importCatalog('administrador', [{ sku: 'V2', name: 'Novo' }])
    expect(sim.products.get('V2')!.status).toBe('draft')
    expect(sim.products.get('V2')!.isAvailable).toBe(false)
    expect(sim.isSellable('V2')).toBe(false)
  })

  it('custo ausente e margem inválida', () => {
    const sim = new Fase81DomainSimulator()
    sim.importCatalog('administrador', [{ sku: 'X', name: 'X' }])
    sim.setRule('administrador', 'margin_on_sell', 30, false)
    expect(() => sim.putCalculated('X')).toThrow(/Custo ausente/)
    expect(() => sim.setRule('administrador', 'margin_on_sell', 100)).toThrow(/invalida/)
  })
})
