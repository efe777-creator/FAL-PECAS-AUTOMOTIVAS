import { describe, expect, it } from 'vitest'
import { lookupMockPlate } from './mockPlateFixtures'

describe('lookupMockPlate', () => {
  it('cluster A — VW Gol Mercosul', () => {
    const r = lookupMockPlate('ABC1D23')
    expect(r.status).toBe('found')
    expect(r.maker).toBe('Volkswagen')
    expect(r.model).toBe('Gol')
    expect(r.vehicleGroup).toBe('cluster_a_vw_passeio')
    expect(r.isMock).toBe(true)
  })

  it('cluster B — Chevrolet Onix antiga', () => {
    const r = lookupMockPlate('ABC1234')
    expect(r.status).toBe('found')
    expect(r.maker).toBe('Chevrolet')
    expect(r.model).toBe('Onix')
    expect(r.vehicleGroup).toBe('cluster_b_gm_passeio')
  })

  it('não inventa motor em incomplete', () => {
    const r = lookupMockPlate('INC0M00')
    expect(r.status).toBe('incomplete')
    expect(r.engine).toBeNull()
    expect(r.version).toBeNull()
  })

  it('ambíguo retorna candidatos', () => {
    const r = lookupMockPlate('AMB1G00')
    expect(r.status).toBe('ambiguous')
    expect(r.candidates.length).toBeGreaterThanOrEqual(2)
  })

  it('fora do catálogo / indisponível / não encontrada', () => {
    expect(lookupMockPlate('OUT0F00').status).toBe('not_in_catalog')
    expect(lookupMockPlate('DWN0T00').status).toBe('unavailable')
    expect(lookupMockPlate('NOT0F00').status).toBe('not_found')
    expect(lookupMockPlate('ZZZ9Z99').status).toBe('not_found')
  })
})
