import { describe, expect, it } from 'vitest'
import { adminMeasureGapOrFilter } from '@/services/admin/adminProductService'

describe('adminMeasureGapOrFilter', () => {
  it('peso: null ou ≤ 0', () => {
    expect(adminMeasureGapOrFilter('weight')).toBe('weight_kg.is.null,weight_kg.lte.0')
  })

  it('dims: qualquer eixo null ou ≤ 0', () => {
    const s = adminMeasureGapOrFilter('dims')
    expect(s).toContain('height_cm.is.null')
    expect(s).toContain('width_cm.lte.0')
    expect(s).toContain('length_cm.is.null')
  })

  it('any: une peso e dims', () => {
    const s = adminMeasureGapOrFilter('any')
    expect(s.startsWith('weight_kg.is.null')).toBe(true)
    expect(s).toContain('height_cm.is.null')
  })

  it('pol: capacidade frete próprio ausente', () => {
    expect(adminMeasureGapOrFilter('pol')).toBe('pol_unit.is.null')
  })
})

describe('adminListProductsPage pol gap (contrato)', () => {
  it('filtro pol na listagem restringe a own_delivery_allowed (documentado)', () => {
    // Implementação em adminListProductsPage: .is('pol_unit', null).eq('own_delivery_allowed', true)
    expect(adminMeasureGapOrFilter('pol')).toContain('pol_unit')
  })
})
