import { describe, expect, it } from 'vitest'
import { hasAdminProductVehicleFilter } from '@/services/admin/adminProductService'

describe('hasAdminProductVehicleFilter', () => {
  it('false quando tudo vazio', () => {
    expect(hasAdminProductVehicleFilter({})).toBe(false)
    expect(hasAdminProductVehicleFilter({ manufacturerId: '', modelId: '' })).toBe(false)
  })

  it('true com montadora, modelo, versão ou motor', () => {
    expect(hasAdminProductVehicleFilter({ manufacturerId: 'm1' })).toBe(true)
    expect(hasAdminProductVehicleFilter({ modelId: 'mod1' })).toBe(true)
    expect(hasAdminProductVehicleFilter({ versionName: 'Comfortline' })).toBe(true)
    expect(hasAdminProductVehicleFilter({ engine: '1.0' })).toBe(true)
  })

  it('ignora whitespace em versão/motor', () => {
    expect(hasAdminProductVehicleFilter({ versionName: '  ' })).toBe(false)
    expect(hasAdminProductVehicleFilter({ engine: ' 1.0 ' })).toBe(true)
  })
})