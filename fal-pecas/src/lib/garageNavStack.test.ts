import { describe, expect, it } from 'vitest'
import {
  garageBackFallback,
  garageLocationKey,
  isGaragePath,
  isSafeAppPath,
  noteGarageNavigation,
  popGarageNavPrevious,
  pushGarageNavLocation,
  readGarageNavStack,
  readGarageReturnTo,
  resolveGarageBackTarget,
} from '@/lib/garageNavStack'

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

describe('garageNavStack', () => {
  it('isGaragePath / isSafeAppPath', () => {
    expect(isGaragePath('/conta/veiculos')).toBe(true)
    expect(isGaragePath('/catalogo?maker=Fiat')).toBe(false)
    expect(isSafeAppPath('/catalogo?maker=Fiat&model=Palio')).toBe(true)
    expect(isSafeAppPath('//evil')).toBe(false)
    expect(isSafeAppPath('https://x')).toBe(false)
  })

  it('garageLocationKey junta pathname + search', () => {
    expect(garageLocationKey('/catalogo', '?maker=Fiat')).toBe('/catalogo?maker=Fiat')
  })

  it('push/pop stack interna', () => {
    const s = memStorage()
    pushGarageNavLocation('/conta/veiculos', '', s)
    pushGarageNavLocation('/conta/veiculos/v1', '?modulo=visao', s)
    pushGarageNavLocation('/conta/veiculos/v1', '?modulo=visual', s)
    const prev = popGarageNavPrevious('/conta/veiculos/v1?modulo=visual', s)
    expect(prev).toBe('/conta/veiculos/v1?modulo=visao')
    expect(readGarageNavStack(s)).toEqual([
      '/conta/veiculos',
      '/conta/veiculos/v1?modulo=visao',
    ])
  })

  it('ao entrar na garagem congela returnTo do catálogo com filtros', () => {
    const s = memStorage()
    noteGarageNavigation('/catalogo', '?maker=Fiat&year=2015', s)
    noteGarageNavigation('/conta/veiculos', '', s)
    expect(readGarageReturnTo(s)).toBe('/catalogo?maker=Fiat&year=2015')
    expect(readGarageNavStack(s)).toEqual(['/conta/veiculos'])
  })

  it('ao entrar na garagem a partir da conta, returnTo = /conta', () => {
    const s = memStorage()
    noteGarageNavigation('/conta', '', s)
    noteGarageNavigation('/conta/veiculos', '', s)
    expect(readGarageReturnTo(s)).toBe('/conta')
  })

  it('resolveGarageBackTarget: stack → home → returnTo catálogo', () => {
    const s = memStorage()
    noteGarageNavigation('/catalogo', '?maker=VW', s)
    noteGarageNavigation('/conta/veiculos', '', s)
    noteGarageNavigation('/conta/veiculos/abc', '?modulo=historico', s)

    expect(resolveGarageBackTarget('/conta/veiculos/abc', '?modulo=historico', s)).toBe(
      '/conta/veiculos',
    )
    expect(resolveGarageBackTarget('/conta/veiculos', '', s)).toBe('/catalogo?maker=VW')
  })

  it('ficha sem stack volta para home da garagem', () => {
    const s = memStorage()
    expect(resolveGarageBackTarget('/conta/veiculos/xyz', '?modulo=visao', s)).toBe(
      '/conta/veiculos',
    )
  })

  it('garageBackFallback legado', () => {
    expect(garageBackFallback('/conta/veiculos/abc')).toBe('/conta/veiculos')
    expect(garageBackFallback('/conta/veiculos')).toBe('/conta')
  })
})
