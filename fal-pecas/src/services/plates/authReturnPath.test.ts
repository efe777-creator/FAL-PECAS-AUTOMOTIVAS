import { beforeEach, describe, expect, it } from 'vitest'
import { resolveAuthReturnPath } from './authReturnPath'
import { clearPendingGarageVehicle, savePendingGarageVehicle } from './pendingGarage'

const memory = new Map<string, string>()

beforeEach(() => {
  memory.clear()
  Object.defineProperty(globalThis, 'sessionStorage', {
    configurable: true,
    value: {
      getItem: (k: string) => memory.get(k) ?? null,
      setItem: (k: string, v: string) => {
        memory.set(k, v)
      },
      removeItem: (k: string) => {
        memory.delete(k)
      },
    },
  })
  clearPendingGarageVehicle()
})

describe('resolveAuthReturnPath', () => {
  it('prioriza from do state', () => {
    savePendingGarageVehicle({
      maker: 'Chevrolet',
      model: 'Onix',
      returnTo: '/catalogo?maker=Chevrolet',
    })
    expect(resolveAuthReturnPath('/conta/veiculos')).toBe('/conta/veiculos')
  })

  it('usa returnTo do pending quando state some (refresh no login)', () => {
    savePendingGarageVehicle({
      maker: 'Chevrolet',
      model: 'Onix',
      plate: 'GAF7032',
      returnTo: '/catalogo?vehicle=1&maker=Chevrolet&model=Onix',
    })
    expect(resolveAuthReturnPath(undefined)).toBe(
      '/catalogo?vehicle=1&maker=Chevrolet&model=Onix',
    )
  })

  it('rejeita paths externos e cai no fallback', () => {
    expect(resolveAuthReturnPath('https://evil.example')).toBe('/conta')
    expect(resolveAuthReturnPath('//evil.example')).toBe('/conta')
  })
})
