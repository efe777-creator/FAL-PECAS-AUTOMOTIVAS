import { describe, expect, it } from 'vitest'
import {
  adminBackFallback,
  adminLocationKey,
  isAdminPath,
  popAdminNavPrevious,
  pushAdminNavLocation,
  readAdminNavStack,
} from '@/lib/adminNavStack'

function memStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial))
  return {
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    setItem: (k: string, v: string) => {
      map.set(k, v)
    },
    removeItem: (k: string) => {
      map.delete(k)
    },
  }
}

describe('adminNavStack', () => {
  it('isAdminPath aceita só /admin', () => {
    expect(isAdminPath('/admin')).toBe(true)
    expect(isAdminPath('/admin/pedidos')).toBe(true)
    expect(isAdminPath('/admin/pedidos?tab=financeiro')).toBe(true)
    expect(isAdminPath('/')).toBe(false)
    expect(isAdminPath('/conta')).toBe(false)
  })

  it('adminLocationKey junta pathname + search', () => {
    expect(adminLocationKey('/admin/pedidos', '?tab=financeiro')).toBe(
      '/admin/pedidos?tab=financeiro',
    )
    expect(adminLocationKey('/admin', '')).toBe('/admin')
  })

  it('push não duplica o topo', () => {
    const s = memStorage()
    pushAdminNavLocation('/admin', '', s)
    pushAdminNavLocation('/admin', '', s)
    expect(readAdminNavStack(s)).toEqual(['/admin'])
  })

  it('push empilha e pop volta ao anterior sem sair do admin', () => {
    const s = memStorage()
    pushAdminNavLocation('/admin', '', s)
    pushAdminNavLocation('/admin/pedidos', '', s)
    pushAdminNavLocation('/admin/pedidos', '?tab=financeiro', s)
    const prev = popAdminNavPrevious('/admin/pedidos?tab=financeiro', s)
    expect(prev).toBe('/admin/pedidos')
    expect(readAdminNavStack(s)).toEqual(['/admin', '/admin/pedidos'])
  })

  it('pop com stack vazio retorna null', () => {
    const s = memStorage()
    expect(popAdminNavPrevious('/admin/pedidos', s)).toBeNull()
  })

  it('adminBackFallback usa crumb com to', () => {
    expect(
      adminBackFallback([
        { to: '/admin' },
        { to: '/admin/pedidos' },
        { to: undefined },
      ]),
    ).toBe('/admin/pedidos')
    expect(adminBackFallback([])).toBe('/admin')
  })
})
