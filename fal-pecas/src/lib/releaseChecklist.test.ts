import { describe, expect, it } from 'vitest'
import { evaluateReleaseChecklist } from '@/lib/releaseChecklist'

const base = {
  productId: 'p1',
  name: 'Pivô',
  commercialRef: 'REF-1',
  sku: 'SKU-1',
  categoryId: 'cat-1',
  status: 'published',
  resolvedPrice: 89.9,
  hasApplication: true,
  hasImage: true,
  publishIfNeeded: false,
}

describe('evaluateReleaseChecklist (D-LIBERAR / IMP-10)', () => {
  it('passa com dados mínimos + preço', () => {
    const r = evaluateReleaseChecklist(base)
    expect(r.canRelease).toBe(true)
    expect(r.hardFails).toHaveLength(0)
  })

  it('bloqueia sem preço', () => {
    const r = evaluateReleaseChecklist({ ...base, resolvedPrice: null })
    expect(r.canRelease).toBe(false)
    expect(r.hardFails.some((f) => f.code === 'price')).toBe(true)
  })

  it('bloqueia sem categoria', () => {
    const r = evaluateReleaseChecklist({ ...base, categoryId: null })
    expect(r.canRelease).toBe(false)
  })

  it('aviso soft sem app/imagem sem bloquear', () => {
    const r = evaluateReleaseChecklist({
      ...base,
      hasApplication: false,
      hasImage: false,
    })
    expect(r.canRelease).toBe(true)
    expect(r.softWarnings).toHaveLength(2)
  })

  it('draft sem publishIfNeeded bloqueia', () => {
    const r = evaluateReleaseChecklist({
      ...base,
      status: 'draft',
      publishIfNeeded: false,
    })
    expect(r.canRelease).toBe(false)
    expect(r.hardFails.some((f) => f.code === 'published')).toBe(true)
  })

  it('draft com publishIfNeeded libera', () => {
    const r = evaluateReleaseChecklist({
      ...base,
      status: 'draft',
      publishIfNeeded: true,
    })
    expect(r.canRelease).toBe(true)
  })
})
