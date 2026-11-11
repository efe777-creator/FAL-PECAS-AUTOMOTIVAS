import { describe, expect, it } from 'vitest'
import { interpretSearchQuery } from './interpretSearchQuery'

const catalog = [
  { maker: 'Hyundai', model: 'HB20', versions: ['Unique'] },
  { maker: 'Fiat', model: 'Palio' },
]

describe('interpretSearchQuery', () => {
  it('HB20 2015 → model+year, sem productQuery', () => {
    const i = interpretSearchQuery('HB20 2015', catalog)
    expect(i.vehicle.model).toBe('HB20')
    expect(i.vehicle.maker).toBe('Hyundai')
    expect(i.vehicle.year).toBe('2015')
    expect(i.productQuery).toBeNull()
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

  it('HB20 Unique 2015 → version Unique do cadastro', () => {
    const i = interpretSearchQuery('HB20 Unique 2015', catalog)
    expect(i.vehicle.version).toBe('Unique')
    expect(i.needsClarification).toBe(false)
  })

  it('Nakata PVI1032 → prioriza código (não perde SKU)', () => {
    const i = interpretSearchQuery('Nakata PVI1032', catalog)
    expect(i.codeHint).toBe('PVI1032')
    expect(i.productQuery).toBe('PVI1032')
  })
})
