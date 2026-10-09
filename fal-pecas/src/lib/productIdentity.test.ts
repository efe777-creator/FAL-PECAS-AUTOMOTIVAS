import { describe, expect, it } from 'vitest'
import {
  displayCodigoReferencia,
  resolveProductIdentity,
} from '@/lib/productIdentity'

describe('productIdentity', () => {
  it('espelha sku → commercialRef quando ref vazia', () => {
    expect(resolveProductIdentity({ sku: 'PVI0127' })).toEqual({
      commercialRef: 'PVI0127',
      sku: 'PVI0127',
    })
  })

  it('espelha commercialRef → sku quando sku vazio', () => {
    expect(resolveProductIdentity({ commercialRef: 'REF-99' })).toEqual({
      commercialRef: 'REF-99',
      sku: 'REF-99',
    })
  })

  it('permite valores distintos quando ambos preenchidos', () => {
    expect(
      resolveProductIdentity({ commercialRef: 'REF-COM', sku: 'SKU-TEC-01' }),
    ).toEqual({ commercialRef: 'REF-COM', sku: 'SKU-TEC-01' })
  })

  it('display usa commercialRef com fallback sku', () => {
    expect(displayCodigoReferencia({ sku: 'A', commercialRef: 'B' })).toBe('B')
    expect(displayCodigoReferencia({ sku: 'A', commercialRef: '' })).toBe('A')
  })
})
