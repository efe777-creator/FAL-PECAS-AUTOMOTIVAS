import { resolveCategoryEmoji, resolveCategoryIcon } from '@/lib/categoryEmoji'
import { describe, expect, it } from 'vitest'

describe('resolveCategoryIcon', () => {
  it('Suspensão → mola/amortecedor (svg)', () => {
    const icon = resolveCategoryIcon({ slug: 'suspensao', name: 'Suspensão' })
    expect(icon.type).toBe('image')
    if (icon.type === 'image') expect(icon.src).toContain('suspensao.png')
  })

  it('Direção → engrenagem', () => {
    expect(resolveCategoryIcon({ slug: 'direcao', name: 'Direção' })).toEqual({
      type: 'emoji',
      value: '⚙️',
    })
  })

  it('Óleos permanece', () => {
    expect(resolveCategoryIcon({ slug: 'oleos-e-fluidos', name: 'Óleos' })).toEqual({
      type: 'emoji',
      value: '🛢️',
    })
  })

  it('Freio e Filtro usam assets', () => {
    const freio = resolveCategoryIcon({ slug: 'freios', name: 'Freios' })
    const filtro = resolveCategoryIcon({ slug: 'filtros', name: 'Filtros' })
    expect(freio.type).toBe('image')
    expect(filtro.type).toBe('image')
    if (freio.type === 'image') expect(freio.src).toContain('freios.png')
    if (filtro.type === 'image') expect(filtro.src).toContain('filtros.png')
  })

  it('compat resolveCategoryEmoji', () => {
    expect(resolveCategoryEmoji({ slug: 'direcao', name: 'Direção' })).toBe('⚙️')
  })
})
