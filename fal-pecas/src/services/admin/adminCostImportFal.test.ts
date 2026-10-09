import { describe, expect, it } from 'vitest'
import {
  FAL_PRINCIPAL_SUPPLIER_CODE,
  isFalPrincipalSupplier,
} from '@/services/admin/adminCostImportService'

describe('isFalPrincipalSupplier', () => {
  it('reconhece FAL-SUP-01 (case-insensitive)', () => {
    expect(isFalPrincipalSupplier(FAL_PRINCIPAL_SUPPLIER_CODE)).toBe(true)
    expect(isFalPrincipalSupplier('fal-sup-01')).toBe(true)
    expect(isFalPrincipalSupplier(' FAL-SUP-01 ')).toBe(true)
  })

  it('rejeita outros códigos', () => {
    expect(isFalPrincipalSupplier('HF-01')).toBe(false)
    expect(isFalPrincipalSupplier(null)).toBe(false)
    expect(isFalPrincipalSupplier('')).toBe(false)
  })
})
