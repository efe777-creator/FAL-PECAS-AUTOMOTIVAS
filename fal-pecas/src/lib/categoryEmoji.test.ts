import { resolveCategoryEmoji, resolveCategoryIcon } from '@/lib/categoryEmoji'
import { describe, expect, it } from 'vitest'

describe('resolveCategoryIcon', () => {
<<<<<<< Updated upstream
  it('Suspensão → mola/amortecedor (svg)', () => {
    const icon = resolveCategoryIcon({ slug: 'suspensao', name: 'Suspensão' })
=======
  it('Suspensão → asset (mesmo com emoji placeholder do banco)', () => {
    const icon = resolveCategoryIcon({
      slug: 'suspensao',
      name: 'Suspensão',
      emoji: '📦',
    })
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
    expect(resolveCategoryIcon({ slug: 'oleos-e-fluidos', name: 'Óleos' })).toEqual({
=======
    expect(resolveCategoryIcon({ slug: 'oleos-e-fluidos', name: 'Óleos e Fluidos' })).toEqual({
>>>>>>> Stashed changes
      type: 'emoji',
      value: '🛢️',
    })
  })

<<<<<<< Updated upstream
  it('Freio e Filtro usam assets', () => {
    const freio = resolveCategoryIcon({ slug: 'freios', name: 'Freios' })
    const filtro = resolveCategoryIcon({ slug: 'filtros', name: 'Filtros' })
=======
  it('Freio e Filtro usam assets (nome sem slug exato)', () => {
    const freio = resolveCategoryIcon({ slug: 'xyz', name: 'Freios', emoji: '📦' })
    const filtro = resolveCategoryIcon({ slug: 'abc', name: 'Filtros', emoji: '📦' })
>>>>>>> Stashed changes
    expect(freio.type).toBe('image')
    expect(filtro.type).toBe('image')
    if (freio.type === 'image') expect(freio.src).toContain('freios.png')
    if (filtro.type === 'image') expect(filtro.src).toContain('filtros.png')
  })

  it('compat resolveCategoryEmoji', () => {
    expect(resolveCategoryEmoji({ slug: 'direcao', name: 'Direção' })).toBe('⚙️')
  })
})
