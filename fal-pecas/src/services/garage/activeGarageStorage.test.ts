import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CustomerSavedVehicle } from '@/types'
import {
  activeGarageStorageKey,
  clearActiveGarage,
  readActiveGarage,
  resolveActiveAgainstGarage,
  vehicleToActiveFilter,
  writeActiveGarage,
} from './activeGarageStorage'

const store = new Map<string, string>()

function v(
  partial: Partial<CustomerSavedVehicle> & Pick<CustomerSavedVehicle, 'id'>,
): CustomerSavedVehicle {
  return {
    customerId: 'c1',
    isPrimary: false,
    makerName: 'Chevrolet',
    modelName: 'Onix',
    year: 2020,
    ...partial,
  }
}

describe('activeGarageStorage (#10)', () => {
  beforeEach(() => {
    store.clear()
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v)
      },
      removeItem: (k: string) => {
        store.delete(k)
      },
      clear: () => store.clear(),
      key: () => null,
      length: 0,
    })
  })

  it('persiste e reidrata por userId (cross-session)', () => {
    writeActiveGarage('user-a', {
      customerVehicleId: 'v2',
      filter: { maker: 'Chevrolet', model: 'Onix' },
      updatedAt: '2026-11-18T00:00:00.000Z',
    })
    expect(readActiveGarage('user-a')?.customerVehicleId).toBe('v2')
    expect(readActiveGarage('user-b')).toBeNull()
    expect(activeGarageStorageKey('user-a')).toBe('fal_active_garage_vehicle:user-a')
    clearActiveGarage('user-a')
    expect(readActiveGarage('user-a')).toBeNull()
  })

  it('invalidação: id excluído cai no principal', () => {
    const list = [
      v({ id: 'v1', isPrimary: true, nickname: 'Principal' }),
      v({ id: 'v2', nickname: 'Ativo' }),
      v({ id: 'v3' }),
    ]
    expect(resolveActiveAgainstGarage('v2', list)?.id).toBe('v2')
    expect(resolveActiveAgainstGarage('gone', list)?.id).toBe('v1')
    // sem principal restante → limpa (não inventa outro ativo)
    expect(resolveActiveAgainstGarage('gone', list.filter((x) => x.id !== 'v1'))).toBeNull()
    expect(resolveActiveAgainstGarage('x', [])).toBeNull()
  })

  it('filtro derivado não muda is_primary', () => {
    const filter = vehicleToActiveFilter(
      v({ id: 'v2', isPrimary: false, engine: '1.0', versionName: 'LT' }),
    )
    expect(filter.maker).toBe('Chevrolet')
    expect(filter.engine).toBe('1.0')
    expect(filter.version).toBe('LT')
  })
})
