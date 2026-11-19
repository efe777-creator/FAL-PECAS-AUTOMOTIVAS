import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CustomerSavedVehicle } from '@/types'
import {
  activeGarageStorageKey,
  clearActiveGarage,
  filterDisplayLabel,
  GUEST_ACTIVE_GARAGE_ID,
  promoteGuestSessionToUser,
  readActiveGarage,
  resolveActiveAgainstGarage,
  resolveActiveGarageStorageId,
  resolveActiveState,
  vehicleToActiveFilter,
  writeActiveGarage,
  writeClearedActiveGarage,
  writeSessionActiveGarage,
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
      setItem: (k: string, val: string) => {
        store.set(k, val)
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
      mode: 'vehicle',
      customerVehicleId: 'v2',
      filter: { maker: 'Chevrolet', model: 'Onix' },
      updatedAt: '2026-11-18T00:00:00.000Z',
    })
    expect(readActiveGarage('user-a')?.customerVehicleId).toBe('v2')
    expect(readActiveGarage('user-a')?.mode).toBe('vehicle')
    expect(readActiveGarage('user-b')).toBeNull()
    expect(activeGarageStorageKey('user-a')).toBe('fal_active_garage_vehicle:user-a')
    clearActiveGarage('user-a')
    expect(readActiveGarage('user-a')).toBeNull()
  })

  it('legado sem mode: reidrata como vehicle', () => {
    store.set(
      activeGarageStorageKey('user-a'),
      JSON.stringify({
        customerVehicleId: 'v9',
        filter: { maker: 'VW' },
        updatedAt: '2026-11-01T00:00:00.000Z',
      }),
    )
    expect(readActiveGarage('user-a')).toEqual({
      mode: 'vehicle',
      customerVehicleId: 'v9',
      filter: { maker: 'VW' },
      updatedAt: '2026-11-01T00:00:00.000Z',
    })
  })

  it('invalidação: id excluído cai no principal', () => {
    const list = [
      v({ id: 'v1', isPrimary: true, nickname: 'Principal' }),
      v({ id: 'v2', nickname: 'Ativo' }),
      v({ id: 'v3' }),
    ]
    expect(resolveActiveAgainstGarage('v2', list)?.id).toBe('v2')
    expect(resolveActiveAgainstGarage('gone', list)?.id).toBe('v1')
    expect(resolveActiveAgainstGarage('gone', list.filter((x) => x.id !== 'v1'))).toBeNull()
    expect(resolveActiveAgainstGarage('x', [])).toBeNull()
  })

  it('cleared não restaura o principal', () => {
    const list = [v({ id: 'v1', isPrimary: true }), v({ id: 'v2' })]
    writeClearedActiveGarage('user-a')
    const stored = readActiveGarage('user-a')
    expect(stored?.mode).toBe('cleared')
    const resolved = resolveActiveState(stored, list)
    expect(resolved.vehicle).toBeNull()
    expect(resolved.filter).toBeNull()
    expect(resolved.mode).toBe('cleared')
  })

  it('session devolve filter sem veículo', () => {
    const list = [v({ id: 'v1', isPrimary: true })]
    writeSessionActiveGarage('user-a', { maker: 'Fiat', model: 'Palio', year: '2010' })
    const resolved = resolveActiveState(readActiveGarage('user-a'), list)
    expect(resolved.mode).toBe('session')
    expect(resolved.vehicle).toBeNull()
    expect(resolved.filter).toEqual({ maker: 'Fiat', model: 'Palio', year: '2010' })
  })

  it('sem storage: fallback ao principal', () => {
    const list = [v({ id: 'v1', isPrimary: true }), v({ id: 'v2' })]
    const resolved = resolveActiveState(null, list)
    expect(resolved.vehicle?.id).toBe('v1')
    expect(resolved.mode).toBe('vehicle')
  })

  it('filtro derivado não muda is_primary', () => {
    const filter = vehicleToActiveFilter(
      v({ id: 'v2', isPrimary: false, engine: '1.0', versionName: 'LT' }),
    )
    expect(filter.maker).toBe('Chevrolet')
    expect(filter.engine).toBe('1.0')
    expect(filter.version).toBe('LT')
  })

  it('filterDisplayLabel', () => {
    expect(filterDisplayLabel({ maker: 'Chevrolet', model: 'Classic', year: '2012' })).toBe(
      'Chevrolet Classic 2012',
    )
    expect(filterDisplayLabel({})).toBe('Veículo')
  })

  it('guest storage id e sessão anônima', () => {
    expect(resolveActiveGarageStorageId(null)).toBe(GUEST_ACTIVE_GARAGE_ID)
    expect(resolveActiveGarageStorageId('u1')).toBe('u1')
    writeSessionActiveGarage(GUEST_ACTIVE_GARAGE_ID, { maker: 'Fiat', model: 'Uno' })
    expect(readActiveGarage(GUEST_ACTIVE_GARAGE_ID)?.mode).toBe('session')
  })

  it('promoteGuestSessionToUser só se user sem preferência', () => {
    writeSessionActiveGarage(GUEST_ACTIVE_GARAGE_ID, { maker: 'VW', model: 'Gol', year: '2012' })
    const promoted = promoteGuestSessionToUser('user-a')
    expect(promoted?.mode).toBe('session')
    expect(promoted?.filter).toEqual({ maker: 'VW', model: 'Gol', year: '2012' })
    expect(readActiveGarage(GUEST_ACTIVE_GARAGE_ID)).toBeNull()

    writeSessionActiveGarage(GUEST_ACTIVE_GARAGE_ID, { maker: 'Fiat', model: 'Argo' })
    writeClearedActiveGarage('user-a')
    expect(promoteGuestSessionToUser('user-a')).toBeNull()
    expect(readActiveGarage(GUEST_ACTIVE_GARAGE_ID)).toBeNull()
  })
})
