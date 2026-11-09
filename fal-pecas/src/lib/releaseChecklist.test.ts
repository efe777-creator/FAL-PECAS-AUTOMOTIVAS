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
    const priceFail = r.hardFails.find((f) => f.code === 'price')
    expect(priceFail?.detail).toMatch(/preço na loja/i)
    expect(priceFail?.detail).not.toMatch(/override|SKU|published/i)
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
    expect(r.softWarnings.find((f) => f.code === 'application')?.detail).toMatch(
      /aplicação em veículo/i,
    )
    expect(r.softWarnings.some((f) => /PVC/i.test(f.detail ?? ''))).toBe(false)
  })

  it('draft sem publishIfNeeded bloqueia', () => {
    const r = evaluateReleaseChecklist({
      ...base,
      status: 'draft',
      publishIfNeeded: false,
    })
    expect(r.canRelease).toBe(false)
    const pubFail = r.hardFails.find((f) => f.code === 'published')
    expect(pubFail?.detail).toMatch(/ainda não publicado/i)
    expect(pubFail?.detail).not.toMatch(/≠|published/i)
  })

  it('draft com publishIfNeeded libera', () => {
    const r = evaluateReleaseChecklist({
      ...base,
      status: 'draft',
      publishIfNeeded: true,
    })
    expect(r.canRelease).toBe(true)
    expect(r.checks.find((c) => c.code === 'published')?.detail).toBe(
      'Será publicado neste passo',
    )
  })

  it('copy PT sem jargão SKU/published/PVC', () => {
    const ok = evaluateReleaseChecklist(base)
    expect(ok.checks.find((c) => c.code === 'published')?.detail).toBe('Já publicado')

    const missingRef = evaluateReleaseChecklist({
      ...base,
      commercialRef: '',
      sku: '',
    })
    expect(missingRef.hardFails.find((f) => f.code === 'commercial_ref')?.detail).toMatch(
      /código interno/i,
    )
    expect(missingRef.summary).not.toMatch(/\bSKU\b|published|PVC|override/i)
  })
})
