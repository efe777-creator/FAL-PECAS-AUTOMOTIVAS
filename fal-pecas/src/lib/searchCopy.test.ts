import { describe, expect, it } from 'vitest'
import {
  SEARCH_ARIA_LABEL,
  SEARCH_CATALOG_HINT,
  SEARCH_INPUT_PLACEHOLDER,
  SEARCH_REFINE_PRODUCT_HINT,
  searchVehicleBrowseLabel,
  searchVehicleEmptyDescription,
} from '@/lib/searchCopy'

describe('searchCopy (Notes #10)', () => {
  it('placeholder e hint priorizam placa + peça', () => {
    expect(SEARCH_INPUT_PLACEHOLDER.toLowerCase()).toContain('placa')
    expect(SEARCH_INPUT_PLACEHOLDER.toLowerCase()).toContain('peça')
    expect(SEARCH_CATALOG_HINT.toLowerCase()).toContain('placa')
    expect(SEARCH_ARIA_LABEL.toLowerCase()).toContain('peças')
  })

  it('faixa só-veículo e refine peça', () => {
    expect(searchVehicleBrowseLabel({ maker: 'Hyundai', model: 'i30' })).toBe(
      'Peças para Hyundai i30',
    )
    expect(SEARCH_REFINE_PRODUCT_HINT.toLowerCase()).toContain('peça')
  })

  it('empty reconheceu veículo sem PVC', () => {
    const msg = searchVehicleEmptyDescription({ maker: 'Hyundai', model: 'I30' })
    expect(msg).toContain('Hyundai I30')
    expect(msg.toLowerCase()).toContain('aplicação')
  })
})
