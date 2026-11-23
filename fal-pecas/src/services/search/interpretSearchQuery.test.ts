import { describe, expect, it } from 'vitest'
import { interpretSearchQuery } from './interpretSearchQuery'

const catalog = [
  { maker: 'Hyundai', model: 'HB20', versions: ['Unique'] },
  /** Nome canônico no mestre loja é I30 (maiúsculo) — matching deve ser case-insensitive. */
  { maker: 'Hyundai', model: 'I30' },
  { maker: 'Fiat', model: 'Palio' },
]

describe('interpretSearchQuery', () => {
  it('HB20 2015 → model+year, sem productQuery; pede peça', () => {
    const i = interpretSearchQuery('HB20 2015', catalog)
    expect(i.vehicle.model).toBe('HB20')
    expect(i.vehicle.maker).toBe('Hyundai')
    expect(i.vehicle.year).toBe('2015')
    expect(i.productQuery).toBeNull()
    expect(i.needsClarification).toBe(true)
    expect(i.clarification).toBe('product')
  })

  it('I30 / i30 → só-veículo (case-insensitive no mestre I30)', () => {
    for (const raw of ['I30', 'i30', 'I30 ']) {
      const i = interpretSearchQuery(raw, catalog)
      expect(i.vehicle.model?.toLowerCase()).toBe('i30')
      expect(i.vehicle.maker).toBe('Hyundai')
      expect(i.productQuery).toBeNull()
      expect(i.needsClarification).toBe(true)
      expect(i.clarification).toBe('product')
    }
  })

  it('Palio e HB20 → reconhecimento no campo de busca', () => {
    const palio = interpretSearchQuery('Palio', catalog)
    expect(palio.vehicle.model).toBe('Palio')
    expect(palio.vehicle.maker).toBe('Fiat')
    const hb20 = interpretSearchQuery('HB20', catalog)
    expect(hb20.vehicle.model).toBe('HB20')
    expect(hb20.vehicle.maker).toBe('Hyundai')
  })

  it('axial I30 → peça + veículo + maker Hyundai', () => {
    const i = interpretSearchQuery('axial I30', catalog)
    expect(i.productQuery?.toLowerCase()).toContain('axial')
    expect(i.vehicle.model?.toLowerCase()).toBe('i30')
    expect(i.vehicle.maker).toBe('Hyundai')
  })

  it('texto livre bosta → productQuery, sem veículo', () => {
    const i = interpretSearchQuery('bosta', catalog)
    expect(i.productQuery?.toLowerCase()).toBe('bosta')
    expect(i.vehicle.model).toBeUndefined()
    expect(i.vehicle.maker).toBeUndefined()
  })

  it('HB20 1.0 2015 → engine', () => {
    const i = interpretSearchQuery('HB20 1.0 2015', catalog)
    expect(i.vehicle.engine).toBe('1.0')
    expect(i.vehicle.year).toBe('2015')
    expect(i.vehicle.model).toBe('HB20')
  })

  it('terminal HB20 2015 → productQuery + vehicle', () => {
    const i = interpretSearchQuery('terminal HB20 2015', catalog)
    expect(i.productQuery?.toLowerCase()).toContain('terminal')
    expect(i.vehicle.model).toBe('HB20')
    expect(i.vehicle.year).toBe('2015')
  })

  it('TDI2116 → codeHint prioritário', () => {
    const i = interpretSearchQuery('TDI2116', catalog)
    expect(i.codeHint).toBe('TDI2116')
    expect(i.productQuery).toBe('TDI2116')
  })

  it('não trata 2015 como ano sem modelo', () => {
    const i = interpretSearchQuery('oleo 2015', catalog)
    expect(i.vehicle.year).toBeUndefined()
  })

  it('Hyundai HB20 → maker+model', () => {
    const i = interpretSearchQuery('Hyundai HB20', catalog)
    expect(i.vehicle.maker).toBe('Hyundai')
    expect(i.vehicle.model).toBe('HB20')
  })

  it('ponteira HB20 2015 → peça, NÃO version', () => {
    const i = interpretSearchQuery('ponteira HB20 2015', catalog)
    expect(i.productQuery?.toLowerCase()).toContain('ponteira')
    expect(i.vehicle.model).toBe('HB20')
    expect(i.vehicle.year).toBe('2015')
    expect(i.vehicle.version).toBeUndefined()
  })

  it('HB20 One 2015 → não aplica version ausente no cadastro', () => {
    const i = interpretSearchQuery('HB20 One 2015', catalog)
    expect(i.vehicle.model).toBe('HB20')
    expect(i.vehicle.year).toBe('2015')
    expect(i.vehicle.version).toBeUndefined()
    expect(i.needsClarification).toBe(true)
    expect(i.clarification).toBe('version')
    expect(i.productQuery).toBeNull()
  })

  it('HB20 Unique 2015 → version Unique; pede peça (só-veículo)', () => {
    const i = interpretSearchQuery('HB20 Unique 2015', catalog)
    expect(i.vehicle.version).toBe('Unique')
    expect(i.productQuery).toBeNull()
    expect(i.needsClarification).toBe(true)
    expect(i.clarification).toBe('product')
  })

  it('Nakata PVI1032 → prioriza código (não perde SKU)', () => {
    const i = interpretSearchQuery('Nakata PVI1032', catalog)
    expect(i.codeHint).toBe('PVI1032')
    expect(i.productQuery).toBe('PVI1032')
  })

  it('NL preciso de um pivo para o palio 2010 → só pivo + veículo', () => {
    const i = interpretSearchQuery('preciso de um pivo para o palio 2010', catalog)
    expect(i.productQuery?.toLowerCase()).toBe('pivo')
    expect(i.vehicle.model).toBe('Palio')
    expect(i.vehicle.maker).toBe('Fiat')
    expect(i.vehicle.year).toBe('2010')
  })

  describe('Corolla vs Corolla Cross (linhas distintas)', () => {
    const both = [
      { maker: 'Toyota', model: 'Corolla' },
      { maker: 'Toyota', model: 'Corolla Cross' },
      { maker: 'Volkswagen', model: 'Fox' },
      { maker: 'Volkswagen', model: 'Cross Fox' },
      { maker: 'Ford', model: 'Fiesta' },
    ]
    const onlyParent = [{ maker: 'Toyota', model: 'Corolla' }]

    it('catálogo com ambos: "corolla cross" → Corolla Cross', () => {
      const i = interpretSearchQuery('corolla cross 2023', both)
      expect(i.vehicle.model).toBe('Corolla Cross')
      expect(i.vehicle.year).toBe('2023')
    })

    it('catálogo com ambos: "corolla" → Corolla', () => {
      const i = interpretSearchQuery('corolla 2018', both)
      expect(i.vehicle.model).toBe('Corolla')
      expect(i.vehicle.year).toBe('2018')
    })

    it('catálogo com ambos: "Toyota Corolla Cross" → Corolla Cross', () => {
      const i = interpretSearchQuery('Toyota Corolla Cross', both)
      expect(i.vehicle.model).toBe('Corolla Cross')
    })

    it('catálogo só com Corolla: "corolla cross" NÃO vira Corolla', () => {
      const i = interpretSearchQuery('corolla cross', onlyParent)
      expect(i.vehicle.model).toBeUndefined()
      expect(i.productQuery?.toLowerCase()).toContain('cross')
    })

    it('catálogo só com Corolla: "Toyota Corolla Cross 2023" NÃO vira Corolla', () => {
      const i = interpretSearchQuery('Toyota Corolla Cross 2023', onlyParent)
      expect(i.vehicle.model).toBeUndefined()
      expect(i.vehicle.year).toBeUndefined()
    })

    it('catálogo só com Corolla: "corolla" → Corolla', () => {
      const i = interpretSearchQuery('corolla 2018', onlyParent)
      expect(i.vehicle.model).toBe('Corolla')
    })

    it('Cross Fox ≠ Fox quando Cross Fox ausente do catálogo', () => {
      const i = interpretSearchQuery('cross fox 2008', [{ maker: 'Volkswagen', model: 'Fox' }])
      expect(i.vehicle.model).toBeUndefined()
    })

    it('New Fiesta ≠ Fiesta quando New Fiesta ausente', () => {
      const i = interpretSearchQuery('new fiesta 2014', [{ maker: 'Ford', model: 'Fiesta' }])
      expect(i.vehicle.model).toBeUndefined()
    })

    it('sufixo comum (versão) continua casando o pai: "HB20 Unique"', () => {
      const i = interpretSearchQuery('HB20 Unique 2015', catalog)
      expect(i.vehicle.model).toBe('HB20')
    })
  })
})