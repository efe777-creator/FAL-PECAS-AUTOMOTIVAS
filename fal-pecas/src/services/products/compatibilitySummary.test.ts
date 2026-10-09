import { describe, expect, it } from 'vitest'
import { groupCompatibilityApps } from '@/services/products/compatibilitySummary'

describe('groupCompatibilityApps (IMP-11 M3)', () => {
  it('agrupa por montadora e deduplica linhas', () => {
    const groups = groupCompatibilityApps([
      {
        productId: 'p1',
        maker: 'CHEVROLET',
        model: 'ONIX',
        engine: '1.0',
        version: null,
        yearLabel: '2017-2020',
        notes: null,
      },
      {
        productId: 'p1',
        maker: 'chevrolet',
        model: 'Onix',
        engine: '1.0',
        version: null,
        yearLabel: '2017-2020',
        notes: null,
      },
      {
        productId: 'p1',
        maker: 'FORD',
        model: 'KA',
        engine: null,
        version: 'SE',
        yearLabel: '2015',
        notes: null,
      },
    ])

    expect(groups).toHaveLength(2)
    const chevy = groups.find((g) => g.maker === 'Chevrolet')
    expect(chevy?.lines).toHaveLength(1)
    expect(chevy?.lines[0]).toMatchObject({
      model: 'Onix',
      engine: '1.0',
      yearLabel: '2017-2020',
    })
    const ford = groups.find((g) => g.maker === 'Ford')
    expect(ford?.lines[0].model).toBe('Ka')
    expect(ford?.lines[0].version).toBe('Se')
  })

  it('não inventa maker quando só há notes', () => {
    const groups = groupCompatibilityApps([
      {
        productId: 'p1',
        maker: null,
        model: 'Aplicação legado',
        engine: null,
        version: null,
        yearLabel: null,
        notes: 'Aplicação legado',
      },
    ])
    expect(groups[0]?.maker).toBe('Outros')
    expect(groups[0]?.lines[0]?.model).toBe('Aplicação Legado')
  })

  it('MARCHA UI: sem truncate silencioso — mantém >4 linhas do mesmo maker', () => {
    const rows = Array.from({ length: 6 }, (_, i) => ({
      productId: 'p1',
      maker: 'Fiat',
      model: `Modelo${i}`,
      engine: null as string | null,
      version: null as string | null,
      yearLabel: `1${i}/...`,
      notes: null as string | null,
    }))
    const groups = groupCompatibilityApps(rows, null)
    expect(groups).toHaveLength(1)
    expect(groups[0].lines).toHaveLength(6)
    const capped = groupCompatibilityApps(rows, 4)
    expect(capped[0].lines).toHaveLength(4)
  })
})
