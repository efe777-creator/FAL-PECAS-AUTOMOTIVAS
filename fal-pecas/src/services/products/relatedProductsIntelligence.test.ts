import { describe, expect, it } from 'vitest'
import { oppositeLado } from '@/lib/productPosicaoLado'
import {
  countPvcOverlap,
  isEligibleRelatedRow,
  isOppositeSidePair,
  rankRelatedCandidates,
  relatedRelevanceScore,
  type RelatedRankRow,
} from '@/services/products/relatedProductsIntelligence'
import type { PvcCompatRow } from '@/services/compatibility/compatibilityEngine'
import type { Product } from '@/types'

function p(partial: Partial<Product> & { id: string }): Product {
  return {
    sku: partial.id,
    name: partial.name ?? partial.id,
    slug: partial.id,
    price: 10,
    available: true,
    ...partial,
  }
}

describe('oppositeLado', () => {
  it('espelha ESQUERDO/DIREITO', () => {
    expect(oppositeLado('ESQUERDO')).toBe('DIREITO')
    expect(oppositeLado('DIREITO')).toBe('ESQUERDO')
  })
  it('AMBOS e null não têm par', () => {
    expect(oppositeLado('AMBOS')).toBeNull()
    expect(oppositeLado(null)).toBeNull()
  })
})

describe('isOppositeSidePair', () => {
  const origin = p({
    id: 'le',
    categorySlug: 'pivos',
    lado: 'ESQUERDO',
    posicao: 'DIANTEIRA',
  })

  it('reconhece lado oposto mesma categoria e posição', () => {
    expect(
      isOppositeSidePair(
        origin,
        p({
          id: 'ld',
          categorySlug: 'pivos',
          lado: 'DIREITO',
          posicao: 'DIANTEIRA',
        }),
      ),
    ).toBe(true)
  })

  it('rejeita mesma categoria sem lado oposto', () => {
    expect(
      isOppositeSidePair(
        origin,
        p({ id: 'x', categorySlug: 'pivos', lado: 'ESQUERDO', posicao: 'DIANTEIRA' }),
      ),
    ).toBe(false)
  })

  it('rejeita categoria diferente', () => {
    expect(
      isOppositeSidePair(
        origin,
        p({
          id: 'ld',
          categorySlug: 'bandejas',
          lado: 'DIREITO',
          posicao: 'DIANTEIRA',
        }),
      ),
    ).toBe(false)
  })

  it('rejeita posição divergente quando ambos têm', () => {
    expect(
      isOppositeSidePair(
        origin,
        p({
          id: 'ld',
          categorySlug: 'pivos',
          lado: 'DIREITO',
          posicao: 'TRASEIRA',
        }),
      ),
    ).toBe(false)
  })

  it('aceita se um dos lados não tem posição', () => {
    expect(
      isOppositeSidePair(
        origin,
        p({ id: 'ld', categorySlug: 'pivos', lado: 'DIREITO', posicao: null }),
      ),
    ).toBe(true)
  })
})

describe('rankRelatedCandidates', () => {
  const origin = p({
    id: 'le',
    categorySlug: 'pivos',
    lado: 'ESQUERDO',
    posicao: 'DIANTEIRA',
  })

  it('prioriza opposite compatible sobre check curado (cenário A/C)', () => {
    const ld = p({
      id: 'ld',
      categorySlug: 'pivos',
      lado: 'DIREITO',
      posicao: 'DIANTEIRA',
    })
    const other = p({ id: 'cur', categorySlug: 'pivos', lado: 'AMBOS' })
    const pvcMap = new Map([
      [
        'ld',
        [
          {
            maker: 'HYUNDAI',
            model: 'HB20',
            yearStart: 2013,
            yearEnd: 2020,
            versionYear: 2015,
            engine: '1.0',
            versionName: null,
            vehicleVersionId: null,
          },
        ],
      ],
    ])
    const out = rankRelatedCandidates({
      origin,
      candidates: [other, ld],
      curatedIds: new Set(['cur']),
      curatedOrder: new Map([['cur', 0]]),
      vehicle: { maker: 'HYUNDAI', model: 'HB20', year: 2015, engine: '1.0' },
      pvcMap,
      excludeIds: new Set(['le']),
      limit: 4,
    })
    expect(out[0]?.id).toBe('ld')
  })

  it('exclui hide / incompatível (cenário E / §17.1)', () => {
    const bad = p({
      id: 'bad',
      categorySlug: 'pivos',
      lado: 'DIREITO',
      posicao: 'DIANTEIRA',
    })
    const ok = p({ id: 'ok', categorySlug: 'pivos' })
    const pvcMap = new Map([
      [
        'bad',
        [
          {
            maker: 'FORD',
            model: 'KA',
            yearStart: 2010,
            yearEnd: 2015,
            versionYear: 2012,
            engine: null,
            versionName: null,
            vehicleVersionId: null,
          },
        ],
      ],
      [
        'ok',
        [
          {
            maker: 'HYUNDAI',
            model: 'HB20',
            yearStart: 2013,
            yearEnd: 2020,
            versionYear: 2015,
            engine: null,
            versionName: null,
            vehicleVersionId: null,
          },
        ],
      ],
    ])
    const out = rankRelatedCandidates({
      origin,
      candidates: [bad, ok],
      curatedIds: new Set(['bad', 'ok']),
      curatedOrder: new Map([
        ['bad', 0],
        ['ok', 1],
      ]),
      vehicle: { maker: 'HYUNDAI', model: 'HB20', year: 2015 },
      pvcMap,
      excludeIds: new Set(['le']),
      limit: 4,
    })
    expect(out.map((x) => x.id)).toEqual(['ok'])
  })

  it('sem veículo: opposite antes de curated (cenário F)', () => {
    const ld = p({
      id: 'ld',
      categorySlug: 'pivos',
      lado: 'DIREITO',
      posicao: 'DIANTEIRA',
    })
    const cur = p({ id: 'cur', categorySlug: 'pivos' })
    const out = rankRelatedCandidates({
      origin,
      candidates: [cur, ld],
      curatedIds: new Set(['cur']),
      curatedOrder: new Map([['cur', 0]]),
      vehicle: null,
      pvcMap: new Map(),
      excludeIds: new Set(['le']),
      limit: 4,
    })
    expect(out.map((x) => x.id)).toEqual(['ld', 'cur'])
  })

  it('sem veículo: entre vários L/R, só o de maior overlap PVC', () => {
    const ldBest = p({
      id: 'ld-best',
      categorySlug: 'pivos',
      lado: 'DIREITO',
    })
    const ldWeak = p({
      id: 'ld-weak',
      categorySlug: 'pivos',
      lado: 'DIREITO',
    })
    const shared: PvcCompatRow = { maker: 'Audi', model: 'A1' }
    const shared2: PvcCompatRow = { maker: 'Audi', model: 'Q3' }
    const vw: PvcCompatRow = { maker: 'Volkswagen', model: 'Fox' }
    const out = rankRelatedCandidates({
      origin: p({ id: 'le', categorySlug: 'pivos', lado: 'ESQUERDO' }),
      candidates: [ldWeak, ldBest],
      curatedIds: new Set(),
      curatedOrder: new Map(),
      vehicle: null,
      pvcMap: new Map([
        ['le', [shared, shared2, vw]],
        ['ld-best', [shared, shared2, vw]],
        ['ld-weak', [vw]],
      ]),
      excludeIds: new Set(['le']),
      limit: 4,
    })
    expect(out.map((x) => x.id)).toEqual(['ld-best'])
  })

  it('sem veículo: L/R sem overlap PVC da origem é descartado (smoke Audi≠Fox)', () => {
    const ldOk = p({
      id: 'ld-ok',
      categorySlug: 'pivos',
      lado: 'DIREITO',
      posicao: 'DIANTEIRA',
    })
    const ldBad = p({
      id: 'ld-bad',
      categorySlug: 'pivos',
      lado: 'DIREITO',
      posicao: 'DIANTEIRA',
    })
    const audi: PvcCompatRow = {
      maker: 'Audi',
      model: 'A1',
      yearStart: 2010,
      yearEnd: 2018,
      versionYear: 2015,
      engine: null,
      versionName: null,
      vehicleVersionId: null,
    }
    const vw: PvcCompatRow = {
      maker: 'Volkswagen',
      model: 'Fox',
      yearStart: 2003,
      yearEnd: 2014,
      versionYear: 2010,
      engine: null,
      versionName: null,
      vehicleVersionId: null,
    }
    const out = rankRelatedCandidates({
      origin,
      candidates: [ldBad, ldOk],
      curatedIds: new Set(),
      curatedOrder: new Map(),
      vehicle: null,
      pvcMap: new Map([
        ['le', [audi]],
        ['ld-ok', [audi]],
        ['ld-bad', [vw]],
      ]),
      excludeIds: new Set(['le']),
      limit: 4,
    })
    expect(out.map((x) => x.id)).toEqual(['ld-ok'])
  })

  it('não força preenchimento além dos elegíveis', () => {
    const only = p({ id: 'only', categorySlug: 'pivos' })
    const out = rankRelatedCandidates({
      origin,
      candidates: [only],
      curatedIds: new Set(['only']),
      curatedOrder: new Map([['only', 0]]),
      vehicle: null,
      pvcMap: new Map(),
      excludeIds: new Set(['le']),
      limit: 4,
    })
    expect(out).toHaveLength(1)
  })

  it('sem veículo: não completa com peers de categoria (§17.4)', () => {
    const cur = p({ id: 'cur', categorySlug: 'pivos' })
    const peer = p({ id: 'peer', categorySlug: 'pivos' })
    const out = rankRelatedCandidates({
      origin,
      candidates: [cur, peer],
      curatedIds: new Set(['cur']),
      curatedOrder: new Map([['cur', 0]]),
      vehicle: null,
      pvcMap: new Map(),
      excludeIds: new Set(['le']),
      limit: 4,
    })
    expect(out.map((x) => x.id)).toEqual(['cur'])
  })

  it('com veículo: peer de categoria só se compatible/similar', () => {
    const peerOk = p({ id: 'peer-ok', categorySlug: 'pivos' })
    const peerCheck = p({ id: 'peer-check', categorySlug: 'pivos' })
    const pvcMap = new Map([
      [
        'peer-ok',
        [
          {
            maker: 'HYUNDAI',
            model: 'HB20',
            yearStart: 2013,
            yearEnd: 2020,
            versionYear: 2015,
            engine: null,
            versionName: null,
            vehicleVersionId: null,
          },
        ],
      ],
    ])
    const out = rankRelatedCandidates({
      origin,
      candidates: [peerCheck, peerOk],
      curatedIds: new Set(),
      curatedOrder: new Map(),
      vehicle: { maker: 'HYUNDAI', model: 'HB20', year: 2015 },
      pvcMap,
      excludeIds: new Set(['le']),
      limit: 4,
    })
    expect(out.map((x) => x.id)).toEqual(['peer-ok'])
  })
})

describe('isEligibleRelatedRow', () => {
  it('bloqueia check de categoria sem vínculo curated/opposite', () => {
    expect(
      isEligibleRelatedRow(
        { curated: false, opposite: false, sealKind: 'check' },
        true,
      ),
    ).toBe(false)
  })
})

describe('relatedRelevanceScore', () => {
  it('available vence unavailable no mesmo tier', () => {
    const base: RelatedRankRow = {
      product: p({ id: 'a' }),
      curated: true,
      opposite: false,
      sealKind: null,
      curatedOrder: 0,
      available: true,
      pvcOverlap: 0,
    }
    const down = { ...base, available: false, product: p({ id: 'b' }) }
    expect(relatedRelevanceScore(base)).toBeLessThan(relatedRelevanceScore(down))
  })

  it('overlap PVC sobe opposite no ranking', () => {
    const low: RelatedRankRow = {
      product: p({ id: 'a' }),
      curated: false,
      opposite: true,
      sealKind: null,
      curatedOrder: 999,
      available: true,
      pvcOverlap: 0,
    }
    const high = { ...low, product: p({ id: 'b' }), pvcOverlap: 3 }
    expect(relatedRelevanceScore(high)).toBeLessThan(relatedRelevanceScore(low))
  })
})

describe('countPvcOverlap', () => {
  it('conta maker|model compartilhados', () => {
    const a: PvcCompatRow[] = [
      { maker: 'Audi', model: 'A1' },
      { maker: 'Audi', model: 'Q3' },
    ]
    const b: PvcCompatRow[] = [
      { maker: 'Audi', model: 'A1' },
      { maker: 'Volkswagen', model: 'Fox' },
    ]
    expect(countPvcOverlap(a, b)).toBe(1)
  })
})
