import { describe, expect, it } from 'vitest'
import type { VehicleOptionTree } from '@/types'
import {
  normalizeVehicleToken,
  reconcileVehicleFilter,
  selectOptionsWithValue,
} from './reconcileVehicleFilter'

const tree: VehicleOptionTree = {
  makers: ['Volkswagen', 'Chevrolet'],
  modelsByMaker: {
    Volkswagen: ['Gol', 'Cross Fox', 'T-Cross'],
    Chevrolet: ['Onix'],
  },
  yearsByModel: {
    'Volkswagen|Cross Fox': ['2005', '2006', '2008'],
    'Volkswagen|Gol': ['2020'],
  },
  enginesByModelYear: {},
  enginesByModel: {
    'Volkswagen|Cross Fox': ['1.6'],
  },
  versionsByModel: {},
}

describe('normalizeVehicleToken', () => {
  it('iguala Crossfox e Cross Fox', () => {
    expect(normalizeVehicleToken('Crossfox')).toBe(normalizeVehicleToken('Cross Fox'))
  })
})

describe('reconcileVehicleFilter', () => {
  it('mapeia modelo da placa para nome oficial do cadastro', () => {
    const r = reconcileVehicleFilter(
      { maker: 'Volkswagen', model: 'Crossfox', year: '2007' },
      tree,
    )
    expect(r.maker).toBe('Volkswagen')
    expect(r.model).toBe('Cross Fox')
    expect(r.year).toBe('2007')
  })

  it('INTENS da API alinha para Intense do cadastro', () => {
    const renaultTree: VehicleOptionTree = {
      ...tree,
      makers: ['Renault'],
      modelsByMaker: { Renault: ['Kwid'] },
      yearsByModel: { 'Renault|Kwid': ['2017'] },
      enginesByModel: { 'Renault|Kwid': ['1.0'] },
      versionsByModel: { 'Renault|Kwid': ['Intense', 'Zen', 'Life'] },
    }
    const r = reconcileVehicleFilter(
      { maker: 'Renault', model: 'Kwid', year: '2017', engine: '1.0', version: 'Intens' },
      renaultTree,
    )
    expect(r.version).toBe('Intense')
  })

  it('placa Kwid não promove modelo poluído Kwid Intens 10MT do cadastro', () => {
    const dirtyTree: VehicleOptionTree = {
      ...tree,
      makers: ['Renault'],
      modelsByMaker: { Renault: ['Kwid Intens 10MT', 'Kwid'] },
      yearsByModel: { 'Renault|Kwid': ['2017'] },
      enginesByModel: { 'Renault|Kwid': ['1.0'] },
      versionsByModel: { 'Renault|Kwid': ['Intense'] },
    }
    const r = reconcileVehicleFilter(
      { maker: 'Renault', model: 'Kwid', year: '2017', engine: '1.0', version: 'Intense' },
      dirtyTree,
    )
    expect(r.model).toBe('Kwid')
    expect(r.version).toBe('Intense')
  })

  it('prefixo: só modelo poluído no pool → mantém needle limpo da placa (não força composto)', () => {
    const dirtyOnly: VehicleOptionTree = {
      ...tree,
      makers: ['Renault'],
      modelsByMaker: { Renault: ['Kwid Intens 10MT'] },
      yearsByModel: {},
      enginesByModel: {},
      versionsByModel: {},
    }
    const r = reconcileVehicleFilter(
      { maker: 'Renault', model: 'Kwid', year: '2017', engine: '1.0', version: 'Intense' },
      dirtyOnly,
    )
    // Não promover "Kwid Intens 10MT" só porque começa com Kwid
    expect(r.model).toBe('Kwid')
  })

  it('placa com modelo composto alinha para base curta no cadastro', () => {
    const dirtyTree: VehicleOptionTree = {
      ...tree,
      makers: ['Ford'],
      modelsByMaker: { Ford: ['Fiesta Flex', 'Fiesta'] },
      yearsByModel: {},
      enginesByModel: { 'Ford|Fiesta': ['1.0'] },
      versionsByModel: {},
    }
    const r = reconcileVehicleFilter(
      { maker: 'Ford', model: 'Fiesta Flex', year: '2007', engine: '1.0' },
      dirtyTree,
    )
    expect(r.model).toBe('Fiesta')
  })

  it('CHEV da placa alinha para Chevrolet no mestre', () => {
    const r = reconcileVehicleFilter(
      { maker: 'CHEV', model: 'Prisma', year: '2019', engine: '1.0', version: 'Joy' },
      {
        ...tree,
        makers: ['Chevrolet', 'Volkswagen'],
        modelsByMaker: { Chevrolet: ['Prisma', 'Onix'], Volkswagen: ['Gol'] },
        enginesByModel: { 'Chevrolet|Prisma': ['1.0'] },
        versionsByModel: { 'Chevrolet|Prisma': ['Joy', 'LT'] },
      },
    )
    expect(r.maker).toBe('Chevrolet')
    expect(r.model).toBe('Prisma')
    expect(r.version).toBe('Joy')
  })

  it('versão/motor sem match no mestre → Não informado', () => {
    const r = reconcileVehicleFilter(
      {
        maker: 'Volkswagen',
        model: 'Cross Fox',
        year: '2007',
        engine: '2.0 Turbo Inventado',
        version: 'XYZ Fantasy',
      },
      tree,
    )
    expect(r.engine).toBe('')
    expect(r.version).toBe('')
  })
})

describe('selectOptionsWithValue', () => {
  it('injeta valor ausente nas options', () => {
    const opts = selectOptionsWithValue(
      [{ value: '2005', label: '2005' }],
      '2007',
    )
    expect(opts[0]).toEqual({ value: '2007', label: '2007 (placa)' })
  })

  it('placa VW Crossfox 2007 sem motor/versão: 5 values existem em options', () => {
    const filter = reconcileVehicleFilter(
      { maker: 'Volkswagen', model: 'Crossfox', year: '2007', engine: '', version: '' },
      tree,
    )
    expect(filter.maker).toBe('Volkswagen')
    expect(filter.model).toBe('Cross Fox')
    expect(filter.year).toBe('2007')
    expect(filter.engine).toBe('')
    expect(filter.version).toBe('')

    const makers = selectOptionsWithValue(
      tree.makers.map((m) => ({ value: m, label: m })),
      filter.maker,
    )
    const models = selectOptionsWithValue(
      (tree.modelsByMaker[filter.maker!] ?? []).map((m) => ({ value: m, label: m })),
      filter.model,
    )
    const years = selectOptionsWithValue(
      (tree.yearsByModel['Volkswagen|Cross Fox'] ?? []).map((y) => ({ value: y, label: y })),
      filter.year,
    )
    const engines = selectOptionsWithValue(
      (tree.enginesByModel['Volkswagen|Cross Fox'] ?? []).map((e) => ({ value: e, label: e })),
      filter.engine,
    )
    const versions = selectOptionsWithValue([], filter.version)

    expect(makers.some((o) => o.value === filter.maker)).toBe(true)
    expect(models.some((o) => o.value === filter.model)).toBe(true)
    expect(years.some((o) => o.value === filter.year)).toBe(true)
    expect(engines.some((o) => o.value === '' && o.label === 'Não informado')).toBe(true)
    expect(versions.some((o) => o.value === '' && o.label === 'Não informado')).toBe(true)
  })
})
