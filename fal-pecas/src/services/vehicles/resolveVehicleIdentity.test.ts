import { describe, expect, it } from 'vitest'
import {
  resolveVehicleIdentity,
  invStatusMessage,
} from './resolveVehicleIdentity'
import type { VehicleOptionTree } from '@/types'

const argoTree: VehicleOptionTree = {
  makers: ['Fiat', 'Chevrolet'],
  modelsByMaker: {
    Fiat: ['Argo'],
    Chevrolet: ['Prisma'],
  },
  yearsByModel: {
    'Fiat|Argo': ['2017', '2018', '2019', '2020'],
    'Chevrolet|Prisma': ['2019'],
  },
  enginesByModel: {
    'Fiat|Argo': ['1.0', '1.3', '1.8'],
    'Chevrolet|Prisma': ['1.0'],
  },
  enginesByModelYear: {},
  versionsByModel: {
    'Fiat|Argo': ['Drive', 'Trekking', 'HGT', 'Precision', 'GSR'],
    'Chevrolet|Prisma': ['Joy'],
  },
}

describe('resolveVehicleIdentity', () => {
  it('Argo Drive 1.3 → exact/incomplete com campos separados', () => {
    const r = resolveVehicleIdentity({
      source: 'text',
      raw: 'Fiat Argo Drive 1.3',
      maker: 'Fiat',
      model: 'Argo Drive 1.3',
      year: '2020',
      tree: argoTree,
    })
    expect(r.filter.maker).toBe('Fiat')
    expect(r.filter.model).toBe('Argo')
    expect(r.filter.engine).toBe('1.3')
    expect(r.filter.version).toBe('Drive')
    expect(['exact', 'incomplete']).toContain(r.status)
    expect(r.allowCanonicalUpsert).toBe(true)
  })

  it('1,3 e Firefly / E.torQ normalizam sem misturar no modelo', () => {
    const r = resolveVehicleIdentity({
      source: 'text',
      maker: 'Fiat',
      model: 'Argo',
      year: '2019',
      engine: '1,3',
      version: 'Trekking',
      tree: argoTree,
    })
    expect(r.filter.engine).toBe('1.3')
    expect(r.filter.version).toBe('Trekking')
    expect(r.filter.model).toBe('Argo')
  })

  it('HL AP fica pending e não inventa versão', () => {
    const r = resolveVehicleIdentity({
      source: 'text',
      raw: 'Fiat Argo HL AP 1.0',
      maker: 'Fiat',
      model: 'Argo HL AP',
      year: '2018',
      engine: '1.0',
      tree: argoTree,
    })
    expect(r.status).toBe('pending_validation')
    expect(r.confidenceBand).toBe('D')
    expect(r.filter.version).toBe('')
    expect(r.pendingCodes.length).toBeGreaterThan(0)
  })

  it('CHEV → Chevrolet', () => {
    const r = resolveVehicleIdentity({
      source: 'plate',
      maker: 'CHEV',
      model: 'Prisma 10MT Joye',
      year: '2019',
      tree: argoTree,
    })
    expect(r.filter.maker).toBe('Chevrolet')
    expect(r.filter.model).toBe('Prisma')
    expect(r.filter.engine).toBe('1.0')
    expect(r.filter.version).toBe('Joy')
  })

  it('paridade texto ≈ placa para mesma identidade Argo', () => {
    const text = resolveVehicleIdentity({
      source: 'text',
      maker: 'Fiat',
      model: 'Argo',
      year: '2020',
      engine: '1.3',
      version: 'Drive',
      tree: argoTree,
    })
    const plate = resolveVehicleIdentity({
      source: 'plate',
      maker: 'Fiat',
      model: 'ARGO DRIVE 1.3',
      year: '2020',
      tree: argoTree,
    })
    expect(text.filter.maker).toBe(plate.filter.maker)
    expect(text.filter.model).toBe(plate.filter.model)
    expect(text.filter.year).toBe(plate.filter.year)
    expect(text.filter.engine).toBe(plate.filter.engine)
    expect(text.filter.version).toBe(plate.filter.version)
  })

  it('mensagens UX por status', () => {
    const r = resolveVehicleIdentity({
      source: 'text',
      maker: 'Fiat',
      model: 'Argo',
      year: '2020',
      tree: argoTree,
    })
    expect(invStatusMessage(r).length).toBeGreaterThan(10)
  })
})
